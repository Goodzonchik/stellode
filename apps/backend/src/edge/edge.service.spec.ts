import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { EdgeService } from './edge.service';

const fullContext = {
  consumerServiceId: 'cs',
  consumerApplicationId: 'ca',
  consumerFeatureId: 'cf',
  consumerFeatureVersionId: 'cfv',
  providerServiceId: 'ps',
  providerApplicationId: 'pa',
  providerFeatureId: 'pf',
  providerFeatureVersionId: 'pfv',
};

const cvProps = (overrides: Record<string, unknown>) => ({
  unitId: 't1',
  status: 'active',
  isPublic: false,
  ...overrides,
});

const mkRecord = (sourceProps: Record<string, unknown>, targetProps: Record<string, unknown>) => ({
  get: (key: string) =>
    key === 'source'
      ? { id: 'src', label: 'ComponentVersion', properties: sourceProps }
      : key === 'target'
        ? { id: 'tgt', label: 'ComponentVersion', properties: targetProps }
        : undefined,
});

describe('EdgeService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl?: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: writeImpl ?? jest.fn().mockResolvedValue({ records: [] }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [EdgeService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(EdgeService), neo4j };
  };

  it('rejects partial consumer context', async () => {
    const { service } = await setup(jest.fn());
    await expect(
      service.create({
        source: 's',
        target: 't',
        context: { ...fullContext, consumerApplicationId: undefined },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects create without full context on both sides', async () => {
    const { service } = await setup(jest.fn());
    await expect(service.create({ source: 's', target: 't' })).rejects.toThrow(BadRequestException);
  });

  it('rejects when component versions are missing', async () => {
    const read = jest.fn().mockResolvedValue({ records: [] });
    const { service } = await setup(read);
    await expect(
      service.create({ source: 's', target: 't', context: fullContext }),
    ).rejects.toThrow('DEPENDS_ON requires two existing ComponentVersion nodes');
    expect(read).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (source:ComponentVersion {id: $source})'),
      { source: 's', target: 't' },
    );
  });

  it('creates DEPENDS_ON for same unit', async () => {
    const read = jest.fn().mockResolvedValue({
      records: [mkRecord(cvProps({}), cvProps({}))],
    });
    const write = jest.fn().mockResolvedValue({ records: [] });
    const { service } = await setup(read, write);
    const res = await service.create({ source: 'a', target: 'b', context: fullContext });
    expect(res.warnings).toEqual([]);
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('CREATE (from)-[:DEPENDS_ON $props]->(to)'),
      expect.objectContaining({
        source: 'a',
        target: 'b',
        props: expect.objectContaining({
          consumerApplicationId: 'ca',
          providerApplicationId: 'pa',
        }),
      }),
    );
  });

  it('rejects cross-unit when target is not public', async () => {
    const read = jest.fn().mockResolvedValue({
      records: [mkRecord(cvProps({ unitId: 't1' }), cvProps({ unitId: 't2', isPublic: false }))],
    });
    const { service } = await setup(read);
    await expect(
      service.create({ source: 'a', target: 'b', context: fullContext }),
    ).rejects.toThrow('isPublic');
  });

  it('creates cross-unit DEPENDS_ON with full context', async () => {
    const read = jest.fn().mockResolvedValue({
      records: [
        mkRecord(cvProps({ unitId: 't1' }), cvProps({ unitId: 't2', isPublic: true })),
      ],
    });
    const write = jest.fn().mockResolvedValue({ records: [] });
    const { service } = await setup(read, write);
    await service.create({ source: 'a', target: 'b', context: fullContext });
    expect(write).toHaveBeenCalled();
  });

  it('rejects unactive target', async () => {
    const read = jest.fn().mockResolvedValue({
      records: [mkRecord(cvProps({}), cvProps({ status: 'unactive' }))],
    });
    const { service } = await setup(read);
    await expect(
      service.create({ source: 'a', target: 'b', context: fullContext }),
    ).rejects.toThrow('unactive');
  });

  it('creates depends-on from feature versions with manual application ids', async () => {
    const responses = [
      { records: [{ get: () => 'consumer-feature' }] },
      { records: [{ get: () => 'provider-feature' }] },
      { records: [{ get: () => 'consumer-service' }] },
      { records: [{ get: () => 'provider-service' }] },
      {
        records: [
          mkRecord(
            cvProps({ unitId: 'unit-a', status: 'active' }),
            cvProps({ unitId: 'unit-b', status: 'active', isPublic: true }),
          ),
        ],
      },
    ];
    const read = jest.fn().mockImplementation(() => Promise.resolve(responses.shift()));
    const write = jest.fn().mockResolvedValue({ records: [] });
    const { service } = await setup(read, write);

    const res = await service.createDependsOnFromFeatureVersions({
      sourceComponentVersionId: 'source-cv',
      targetComponentVersionId: 'target-cv',
      consumerFeatureVersionId: 'consumer-fv',
      providerFeatureVersionId: 'provider-fv',
      consumerApplicationId: 'consumer-app',
      providerApplicationId: 'provider-app',
    });

    expect(res.warnings).toEqual([]);
    expect(write).toHaveBeenCalledTimes(1);
    const writeParams = write.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(writeParams.props).toEqual(
      expect.objectContaining({
        consumerApplicationId: 'consumer-app',
        providerApplicationId: 'provider-app',
        consumerFeatureVersionId: 'consumer-fv',
        providerFeatureVersionId: 'provider-fv',
      }),
    );
  });

  const deleteDto = {
    sourceComponentVersionId: 'source-cv',
    targetComponentVersionId: 'target-cv',
    consumerFeatureVersionId: 'fv-draft',
    consumerApplicationId: 'app-a',
    providerApplicationId: 'app-b',
  };

  it('deletes DEPENDS_ON when FeatureVersion is draft', async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ records: [{ get: () => 'draft' }] })
      .mockResolvedValueOnce({ records: [{ get: () => 1 }] });
    const write = jest.fn().mockResolvedValue({ records: [] });
    const { service } = await setup(read, write);

    await service.deleteDependsOnFromFeatureVersions(deleteDto);

    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('DELETE r'),
      expect.objectContaining({
        sourceId: 'source-cv',
        targetId: 'target-cv',
        consumerFeatureVersionId: 'fv-draft',
        consumerApplicationId: 'app-a',
        providerApplicationId: 'app-b',
      }),
    );
  });

  it('rejects delete when FeatureVersion is not draft', async () => {
    const read = jest.fn().mockResolvedValue({ records: [{ get: () => 'active' }] });
    const write = jest.fn();
    const { service } = await setup(read, write);

    await expect(service.deleteDependsOnFromFeatureVersions(deleteDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects delete when FeatureVersion is missing', async () => {
    const read = jest.fn().mockResolvedValue({ records: [] });
    const write = jest.fn();
    const { service } = await setup(read, write);

    await expect(service.deleteDependsOnFromFeatureVersions(deleteDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects delete when matching DEPENDS_ON is missing', async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ records: [{ get: () => 'draft' }] })
      .mockResolvedValueOnce({ records: [{ get: () => 0 }] });
    const write = jest.fn();
    const { service } = await setup(read, write);

    await expect(service.deleteDependsOnFromFeatureVersions(deleteDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(write).not.toHaveBeenCalled();
  });
});
