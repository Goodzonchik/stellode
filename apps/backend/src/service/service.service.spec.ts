import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ServiceService } from './service.service';

const svcProps = (overrides: Record<string, unknown>) => ({
  id: 's1',
  name: 'Orders',
  unitId: 't1',
  ...overrides,
});

const mkNode = (props: Record<string, unknown>) => ({
  properties: props,
  id: props.id as string,
  label: 'Service' as const,
});

const mkServiceRecord = (props: Record<string, unknown>) => ({
  get: (key: string) => (key === 'service' ? mkNode(props) : undefined),
});

describe('ServiceService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl?: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: writeImpl ?? jest.fn().mockResolvedValue({ records: [] }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [ServiceService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(ServiceService), neo4j };
  };

  describe('unarchive', () => {
    it('throws when service missing', async () => {
      const read = jest.fn().mockResolvedValue({ records: [] });
      const { service } = await setup(read);
      await expect(service.unarchive('missing')).rejects.toThrow(NotFoundException);
    });

    it('is idempotent when service is already active', async () => {
      const active = svcProps({ status: 'active' });
      const read = jest.fn().mockResolvedValue({ records: [mkServiceRecord(active)] });
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.unarchive('s1');
      expect(res).toEqual(active);
      expect(write).not.toHaveBeenCalled();
    });

    it('sets status active when archived', async () => {
      const archived = svcProps({ status: 'archive' });
      const restored = svcProps({ status: 'active' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkServiceRecord(archived)] })
        .mockResolvedValueOnce({ records: [mkServiceRecord(restored)] });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const { service, neo4j } = await setup(read, write);
      const res = await service.unarchive('s1');
      expect(write).toHaveBeenCalledWith(
        expect.stringContaining('SET service.status = $status'),
        expect.objectContaining({ id: 's1', status: 'active' }),
      );
      expect(res).toEqual(restored);
      expect(neo4j.read).toHaveBeenCalledTimes(2);
    });

    it('is idempotent when status omitted (treated as active)', async () => {
      const bare = svcProps({});
      const read = jest.fn().mockResolvedValue({ records: [mkServiceRecord(bare)] });
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.unarchive('s1');
      expect(res).toEqual({
        id: bare.id,
        unitId: bare.unitId,
        name: bare.name,
        description: bare.description,
        type: bare.type,
        status: bare.status,
      });
      expect(write).not.toHaveBeenCalled();
    });
  });
});
