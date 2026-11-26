import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { FeatureService } from './feature.service';

const featureProps = (overrides: Record<string, unknown> = {}) => ({
  id: 'f1',
  unitId: 'u1',
  name: 'SendEmail',
  description: null as string | null,
  type: 'feature',
  ...overrides,
});

const mkNode = (props: Record<string, unknown>) => ({
  properties: props,
  id: props.id as string,
  label: 'Feature' as const,
});

const mkFindAllRecord = (args: {
  readonly feature: Record<string, unknown>;
  readonly services: ReadonlyArray<{ id: string; name: string } | null>;
}) => ({
  get: (key: string) => {
    if (key === 'feature') return mkNode(args.feature);
    if (key === 'services') return [...args.services];
    return undefined;
  },
});

describe('FeatureService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl?: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: writeImpl ?? jest.fn().mockResolvedValue({ records: [] }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [FeatureService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(FeatureService), neo4j };
  };

  describe('findAll', () => {
    it('loads features with services in a single read', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [
          mkFindAllRecord({
            feature: featureProps({ id: 'f1', name: 'Alpha' }),
            services: [
              { id: 's1', name: 'Mail' },
              null,
            ],
          }),
          mkFindAllRecord({
            feature: featureProps({ id: 'f2', name: 'Beta' }),
            services: [null],
          }),
        ],
      });
      const { service, neo4j } = await setup(read);

      const rows = await service.findAll({ unitId: 'u1' });

      expect(neo4j.read).toHaveBeenCalledTimes(1);
      expect(neo4j.read.mock.calls[0][1]).toEqual({ unitId: 'u1' });
      const query = neo4j.read.mock.calls[0][0] as string;
      expect(query).toContain('STAKEHOLDER');
      expect(query).toContain('OPTIONAL MATCH');
      expect(query).toContain('AGGREGATES');
      expect(query).toContain('collect(DISTINCT');
      expect(query).not.toContain('$featureId');
      expect(rows).toEqual([
        {
          id: 'f1',
          unitId: 'u1',
          name: 'Alpha',
          description: null,
          type: 'feature',
          services: [{ id: 's1', name: 'Mail' }],
        },
        {
          id: 'f2',
          unitId: 'u1',
          name: 'Beta',
          description: null,
          type: 'feature',
          services: [],
        },
      ]);
    });
  });
});
