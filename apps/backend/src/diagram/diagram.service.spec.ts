import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { DiagramService } from './diagram.service';

const emptyResult = { records: [] };

const mkUnitExists = () => ({
  records: [{ get: () => ({ id: 'u1' }) }],
});

describe('DiagramService application/unit DEPENDS_ON', () => {
  const setup = async (readImpl: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: jest.fn().mockResolvedValue(emptyResult),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DiagramService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(DiagramService), neo4j };
  };

  it('getUnitDiagram excludes DEPENDS_ON and includes FeatureVersion USES', async () => {
    const read = jest.fn().mockImplementation(async (cypher: string) => {
      if (cypher.includes('MATCH (t:Unit {id: $id}) RETURN t LIMIT 1')) {
        return mkUnitExists();
      }
      return emptyResult;
    });
    const { service } = await setup(read);
    await service.getUnitDiagram('u1');
    const queries = read.mock.calls.map((call) => call[0] as string);
    const dependsInternal = queries.find(
      (q) =>
        q.includes('DEPENDS_ON') &&
        q.includes('a.id IN ids AND b.id IN ids'),
    );
    expect(dependsInternal).toBeUndefined();
    const usesQuery = queries.find(
      (q) =>
        q.includes('USES_COMPONENT_VERSION') &&
        q.includes("fv.status IN ['draft', 'active', 'deprecated']"),
    );
    expect(usesQuery).toBeDefined();
    expect(usesQuery).toContain("hc.status IN ['active', 'deprecated']");
    expect(usesQuery).toContain("ApplicationVersion {status: 'current'}");
    const featureVersionQuery = queries.find(
      (q) =>
        q.includes('FeatureVersion') &&
        q.includes('HAS_VERSION|HAS_DRAFT') &&
        q.includes('AGGREGATES'),
    );
    expect(featureVersionQuery).toBeDefined();
    const unconditionalOwns = queries.find(
      (q) =>
        q.includes('[r:OWNS]') &&
        !q.includes('HAS_COMPONENT') &&
        !q.includes("status: 'current'"),
    );
    expect(unconditionalOwns).toBeUndefined();
    const ownsViaCurrent = queries.find(
      (q) =>
        q.includes('[r:OWNS]') &&
        q.includes("ApplicationVersion {status: 'current'}") &&
        q.includes("hc.status IN ['active', 'deprecated']"),
    );
    expect(ownsViaCurrent).toBeDefined();
    const unconditionalMaintains = queries.find(
      (q) =>
        q.includes('[r:MAINTAINS]') &&
        !q.includes('HAS_COMPONENT') &&
        !q.includes("status: 'current'"),
    );
    expect(unconditionalMaintains).toBeUndefined();
    const maintainsViaCurrent = queries.find(
      (q) =>
        q.includes('[r:MAINTAINS]') &&
        q.includes("ApplicationVersion {status: 'current'}") &&
        q.includes("hc.status IN ['active', 'deprecated']"),
    );
    expect(maintainsViaCurrent).toBeDefined();
  });

  it('getTeamDiagram includes internal DEPENDS_ON between composition CVs', async () => {
    const read = jest.fn().mockImplementation(async (cypher: string) => {
      if (cypher.includes('HAS_TEAM') && cypher.includes('RETURN tm LIMIT 1')) {
        return mkUnitExists();
      }
      return emptyResult;
    });
    const { service } = await setup(read);
    await service.getTeamDiagram('tm1');
    const internal = read.mock.calls
      .map((call) => call[0] as string)
      .find(
        (q) =>
          q.includes('DEPENDS_ON') &&
          q.includes('a.id IN ids AND b.id IN ids'),
      );
    expect(internal).toBeDefined();
  });

  it('getTeamDiagram USES match includes only active FeatureVersion', async () => {
    const read = jest.fn().mockImplementation(async (cypher: string) => {
      if (cypher.includes('HAS_TEAM') && cypher.includes('RETURN tm LIMIT 1')) {
        return mkUnitExists();
      }
      return emptyResult;
    });
    const { service } = await setup(read);
    await service.getTeamDiagram('tm1');
    const usesQueries = read.mock.calls
      .map((call) => call[0] as string)
      .filter((q) => q.includes('USES_COMPONENT_VERSION') && q.includes('RETURN u AS node'));
    expect(usesQueries.length).toBeGreaterThan(0);
    for (const query of usesQueries) {
      expect(query).toContain("FeatureVersion {status: 'active'}");
      expect(query).not.toMatch(/MATCH \(u\)-\[r:USES_COMPONENT_VERSION\]/);
    }
  });

  it('getFeatureVersionDiagram loads outgoing DEPENDS_ON filtered by consumerFeatureVersionId', async () => {
    const cvNode = {
      id: 'cv1',
      label: 'ComponentVersion',
      properties: { name: 'Comp', version: '1' },
    };
    const read = jest.fn().mockImplementation(async (cypher: string) => {
      if (cypher.includes('MATCH (fv:FeatureVersion {id: $id}) RETURN fv LIMIT 1')) {
        return { records: [{ get: () => ({ id: 'fv1' }) }] };
      }
      if (
        cypher.includes('HAS_VERSION|HAS_DRAFT') &&
        cypher.includes('RETURN f.id AS value')
      ) {
        return { records: [{ get: (key: string) => (key === 'value' ? 'f1' : null) }] };
      }
      if (cypher.includes('RETURN fv.status AS value')) {
        return { records: [{ get: (key: string) => (key === 'value' ? 'draft' : null) }] };
      }
      if (
        cypher.includes('USES_COMPONENT_VERSION') &&
        cypher.includes('RETURN cv AS node') &&
        !cypher.includes('HAS_VERSION|HAS_DRAFT')
      ) {
        return {
          records: [
            {
              get: (key: string) => (key === 'node' ? cvNode : null),
            },
          ],
        };
      }
      return emptyResult;
    });
    const { service } = await setup(read);
    await service.getFeatureVersionDiagram('fv1');
    const queries = read.mock.calls.map((call) => call[0] as string);
    const scoped = queries.find(
      (q) =>
        q.includes('DEPENDS_ON') &&
        q.includes('a.id IN $ids') &&
        q.includes('consumerFeatureVersionId') &&
        q.includes('$featureVersionId'),
    );
    expect(scoped).toBeDefined();
    expect(scoped).not.toMatch(/a\.id IN \$ids OR b\.id IN \$ids/);
    const depsCall = read.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0] as string).includes('DEPENDS_ON') &&
        (call[0] as string).includes('consumerFeatureVersionId'),
    );
    expect(depsCall?.[1]).toEqual(
      expect.objectContaining({ featureVersionId: 'fv1', ids: expect.arrayContaining(['cv1']) }),
    );
    const providerApps = queries.find(
      (q) =>
        q.includes('DEPENDS_ON') &&
        q.includes('providerApplicationId') &&
        q.includes('MATCH (appRoot:Application {id: appId})'),
    );
    expect(providerApps).toBeDefined();
    expect(providerApps).toContain("ApplicationVersion {status: 'current'}");
    expect(providerApps).not.toContain('PINNED_TO_APPLICATION_VERSION');
  });

  it('getFeatureVersionDiagram draft resolves ApplicationVersion via current', async () => {
    const read = jest.fn().mockImplementation(async (cypher: string) => {
      if (cypher.includes('MATCH (fv:FeatureVersion {id: $id}) RETURN fv LIMIT 1')) {
        return { records: [{ get: () => ({ id: 'fv1' }) }] };
      }
      if (cypher.includes('HAS_VERSION|HAS_DRAFT') && cypher.includes('RETURN f.id AS value')) {
        return { records: [{ get: (key: string) => (key === 'value' ? 'f1' : null) }] };
      }
      if (cypher.includes('RETURN fv.status AS value')) {
        return { records: [{ get: (key: string) => (key === 'value' ? 'draft' : null) }] };
      }
      return emptyResult;
    });
    const { service } = await setup(read);
    await service.getFeatureVersionDiagram('fv1');
    const queries = read.mock.calls.map((call) => call[0] as string);
    const usesAppAv = queries.find(
      (q) =>
        q.includes('USES_COMPONENT_VERSION') &&
        q.includes('Application {id: appId}') &&
        q.includes('HAS_VERSION'),
    );
    expect(usesAppAv).toBeDefined();
    expect(usesAppAv).toContain("ApplicationVersion {status: 'current'}");
    expect(usesAppAv).not.toContain('PINNED_TO_APPLICATION_VERSION');
  });

  it('getFeatureVersionDiagram published resolves ApplicationVersion via PINNED_TO_APPLICATION_VERSION', async () => {
    const read = jest.fn().mockImplementation(async (cypher: string) => {
      if (cypher.includes('MATCH (fv:FeatureVersion {id: $id}) RETURN fv LIMIT 1')) {
        return { records: [{ get: () => ({ id: 'fv1' }) }] };
      }
      if (cypher.includes('HAS_VERSION|HAS_DRAFT') && cypher.includes('RETURN f.id AS value')) {
        return { records: [{ get: (key: string) => (key === 'value' ? 'f1' : null) }] };
      }
      if (cypher.includes('RETURN fv.status AS value')) {
        return { records: [{ get: (key: string) => (key === 'value' ? 'active' : null) }] };
      }
      return emptyResult;
    });
    const { service } = await setup(read);
    await service.getFeatureVersionDiagram('fv1');
    const queries = read.mock.calls.map((call) => call[0] as string);
    const pinnedAv = queries.filter((q) => q.includes('PINNED_TO_APPLICATION_VERSION'));
    expect(pinnedAv.length).toBeGreaterThan(0);
    const usesAppAv = queries.find(
      (q) =>
        q.includes('USES_COMPONENT_VERSION') &&
        q.includes('Application {id: appId}') &&
        q.includes('PINNED_TO_APPLICATION_VERSION'),
    );
    expect(usesAppAv).toBeDefined();
    expect(usesAppAv).not.toContain("ApplicationVersion {status: 'current'}");
  });
});
