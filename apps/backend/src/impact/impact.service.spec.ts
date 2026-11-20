import { Test } from '@nestjs/testing';
import { ImpactQueryMode } from '@stellode/models';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ImpactService } from './impact.service';

describe('ImpactService', () => {
  const emptyImpactCore = {
    mode: ImpactQueryMode.OnProd as const,
    anomalies: [],
    units: [],
    teams: [],
    services: [],
    features: [],
    applications: [],
    components: [],
    consumers: [],
    providers: [],
  };

  const setupNeo4jMock = () =>
    ({
      read: jest.fn().mockResolvedValue({ records: [] }),
      write: jest.fn().mockResolvedValue({ records: [] }),
    }) satisfies Pick<Neo4jService, 'read' | 'write'>;

  const createService = async (neo4j: ReturnType<typeof setupNeo4jMock>) => {
    const moduleRef = await Test.createTestingModule({
      providers: [ImpactService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return moduleRef.get(ImpactService);
  };

  it('returns empty impact shape when seed query has no rows (component)', async () => {
    const neo4j = setupNeo4jMock();
    const service = await createService(neo4j);
    const res = await service.component('comp-1', ImpactQueryMode.OnProd);
    expect(res).toEqual({
      componentId: 'comp-1',
      ...emptyImpactCore,
      applicationsDetail: [],
    });
    expect(neo4j.read).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (c:Component {id: $id})-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)'),
      { id: 'comp-1' },
    );
    expect(neo4j.read).toHaveBeenCalledWith(
      expect.stringContaining(`cv.status IN ['active', 'deprecated']`),
      { id: 'comp-1' },
    );
  });

  it('returns empty impact when archived service in on-prod mode', async () => {
    const neo4j = setupNeo4jMock();
    neo4j.read.mockResolvedValueOnce({
      records: [{ get: (k: string) => (k === 'value' ? 'archive' : null), keys: () => ['value'] }],
    });
    const service = await createService(neo4j);
    const res = await service.service('svc-arch', ImpactQueryMode.OnProd);
    expect(res).toEqual({ serviceId: 'svc-arch', ...emptyImpactCore });
    expect(neo4j.read).toHaveBeenCalledTimes(1);
    expect(neo4j.read).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (svc:Service {id: $id}) RETURN svc.status AS value'),
      { id: 'svc-arch' },
    );
  });

  it('returns empty impact shape when seed query has no rows (service draft)', async () => {
    const neo4j = setupNeo4jMock();
    const service = await createService(neo4j);
    const res = await service.service('svc-1', ImpactQueryMode.Draft);
    expect(res).toEqual({ serviceId: 'svc-1', ...emptyImpactCore, mode: ImpactQueryMode.Draft });
    expect(neo4j.read).toHaveBeenCalledWith(
      expect.stringContaining(
        'MATCH (s:Service {id: $id})-[agg:AGGREGATES]->(:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion)',
      ),
      { id: 'svc-1' },
    );
    expect(neo4j.read).not.toHaveBeenCalledWith(
      expect.stringContaining(`agg.deleted`),
      expect.anything(),
    );
  });
});
