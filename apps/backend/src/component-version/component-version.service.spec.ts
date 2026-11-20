import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ComponentVersionService } from './component-version.service';

const mkCvNode = (props: Record<string, unknown>) => ({
  id: String(props.id),
  label: 'ComponentVersion' as const,
  properties: { status: 'draft', unitId: 't1', ...props },
});

const scalarRecord = (value: unknown) => ({
  get: (key: string) => (key === 'value' ? value : undefined),
});

const setupService = async (read: jest.Mock, write: jest.Mock) => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ComponentVersionService,
      { provide: Neo4jService, useValue: { read, write } },
    ],
  }).compile();
  return moduleRef.get(ComponentVersionService);
};

const createReadMocks = (maxVersionNumber: number | null) =>
  jest
    .fn()
    .mockResolvedValueOnce({ records: [scalarRecord(0)] })
    .mockResolvedValueOnce({ records: [scalarRecord(maxVersionNumber)] })
    .mockResolvedValueOnce({ records: [scalarRecord(0)] });

const createWriteMocks = (draftProps: Record<string, unknown>) =>
  jest
    .fn()
    .mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => (key === 'newDraft' ? mkCvNode(draftProps) : undefined),
        },
      ],
    })
    .mockResolvedValueOnce({ records: [] });

describe('ComponentVersionService', () => {
  describe('create', () => {
    it('inherits isPublic from parent Component in Cypher', async () => {
      const read = createReadMocks(null);
      const write = createWriteMocks({ id: 'v-new', componentId: 'c1' });

      const service = await setupService(read, write);
      await service.create({ componentElementId: 'c1' });

      const createQuery = write.mock.calls[0][0] as string;
      expect(createQuery).toContain('isPublic: coalesce(component.isPublic, false)');
      const createParams = write.mock.calls[0][1] as Record<string, unknown>;
      expect(createParams.componentId).toBe('c1');
    });

    it('creates INHERITED from active/deprecated base and copies DEPENDS_ON with properties', async () => {
      const read = createReadMocks(0);
      const write = createWriteMocks({ id: 'v-new', componentId: 'c1' });

      const service = await setupService(read, write);
      await service.create({ componentElementId: 'c1' });

      const createQuery = write.mock.calls[0][0] as string;
      expect(createQuery).toContain('CREATE (newDraft)-[:INHERITED]->(previous)');
      expect(createQuery).toContain("description: coalesce(base.description, '')");
      expect(createQuery).toContain("candidate.status IN ['active', 'deprecated']");
      const createParams = write.mock.calls[0][1] as Record<string, unknown>;
      expect(createParams.version).toBe('1');

      const copyDepsQuery = write.mock.calls[1][0] as string;
      expect(copyDepsQuery).toContain('MATCH (latest)-[oldEdge:DEPENDS_ON]->(target:ComponentVersion)');
      expect(copyDepsQuery).toContain('CREATE (newDraft)-[newEdge:DEPENDS_ON]->(target)');
      expect(copyDepsQuery).toContain('SET newEdge = properties(oldEdge)');
    });

    it('stores custom version string when provided', async () => {
      const read = createReadMocks(0);
      const write = createWriteMocks({ id: 'v-new', componentId: 'c1', version: 'hotfix-1' });

      const service = await setupService(read, write);
      await service.create({ componentElementId: 'c1', version: 'hotfix-1' });

      const createParams = write.mock.calls[0][1] as Record<string, unknown>;
      expect(createParams.version).toBe('hotfix-1');
    });

    it('rejects when component already has a draft version', async () => {
      const read = jest.fn().mockResolvedValueOnce({ records: [scalarRecord(1)] });
      const write = jest.fn();

      const service = await setupService(read, write);
      await expect(service.create({ componentElementId: 'c1' })).rejects.toThrow(
        'Component already has a draft version',
      );
      expect(write).not.toHaveBeenCalled();
    });
  });
});
