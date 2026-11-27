import { EventEmitter2 } from '@nestjs/event-emitter';
import neo4j, { type Driver } from 'neo4j-driver';
import { VersionStatus } from '@stellode/models';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ApplicationVersionService } from './application-version.service';

const uri = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const user = process.env.NEO4J_USER ?? 'neo4j';
const password = process.env.NEO4J_PASSWORD ?? 'stellode';

describe('ApplicationVersionService atomic release (integration)', () => {
  let driver: Driver;
  let neo4jService: Neo4jService;
  let service: ApplicationVersionService;
  const marker = `av-release-it-${Date.now()}`;
  const unitId = `${marker}-unit`;
  const applicationId = `${marker}-app`;
  const componentId = `${marker}-cmp`;
  const componentVersionId = `${marker}-cv`;

  beforeAll(() => {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    neo4jService = new Neo4jService(driver);
    service = new ApplicationVersionService(neo4jService, {
      emit: jest.fn(),
    } as unknown as EventEmitter2);
  });

  afterAll(async () => {
    await neo4jService.write(
      `
      MATCH (n)
      WHERE n.id STARTS WITH $marker OR n.unitId = $unitId OR n.marker = $marker
      DETACH DELETE n
      `,
      { marker, unitId },
    );
    await driver.close();
  });

  beforeEach(async () => {
    await neo4jService.write(
      `
      MATCH (n)
      WHERE n.id STARTS WITH $marker OR n.unitId = $unitId OR n.marker = $marker
      DETACH DELETE n
      `,
      { marker, unitId },
    );
    await neo4jService.write(
      `
      CREATE (u:Unit {id: $unitId, name: 'IT Unit', type: 'unit', marker: $marker})
      CREATE (app:Application {
        id: $applicationId,
        name: 'IT App',
        unitId: $unitId,
        type: 'application',
        marker: $marker
      })
      CREATE (c:Component {
        id: $componentId,
        name: 'IT Component',
        unitId: $unitId,
        type: 'component',
        marker: $marker
      })
      CREATE (cv:ComponentVersion {
        id: $componentVersionId,
        componentId: $componentId,
        unitId: $unitId,
        versionNumber: 1,
        version: '1.0.0',
        status: 'active',
        name: 'IT Component',
        type: 'componentVersion',
        marker: $marker
      })
      CREATE (c)-[:HAS_VERSION]->(cv)
      `,
      { marker, unitId, applicationId, componentId, componentVersionId },
    );
  });

  it('creates first release with HAS_COMPONENT in one committed transaction', async () => {
    const released = await service.release({
      applicationId,
      components: [{ componentVersionId, status: VersionStatus.Active }],
      version: '1.0.0',
    });

    expect(released).toMatchObject({
      applicationId,
      status: 'current',
      version: '1.0.0',
    });

    const linked = await neo4jService.read(
      `
      MATCH (av:ApplicationVersion {id: $avId})-[:HAS_COMPONENT {status: 'active'}]->(cv:ComponentVersion {id: $cvId})
      RETURN count(*) AS value
      `,
      { avId: released.id, cvId: componentVersionId },
    );
    expect(Number(linked.records[0]?.get('value') ?? 0)).toBe(1);
  });

  it('rolls back release when a later step fails inside the transaction', async () => {
    const original = neo4jService.writeInTransaction.bind(neo4jService);
    jest.spyOn(neo4jService, 'writeInTransaction').mockImplementation(async (work) =>
      original(async (run) => {
        let createCount = 0;
        const wrappedRun = async (query: string, parameters?: Record<string, unknown>) => {
          const result = await run(query, parameters);
          if (query.includes('CREATE (newAv:ApplicationVersion')) {
            createCount += 1;
          }
          if (createCount > 0 && query.includes('HAS_COMPONENT')) {
            throw new Error('forced link failure');
          }
          return result;
        };
        return work(wrappedRun);
      }),
    );

    await expect(
      service.release({
        applicationId,
        components: [{ componentVersionId, status: VersionStatus.Active }],
        version: '1.0.0',
      }),
    ).rejects.toThrow(/forced link failure/);

    const avCount = await neo4jService.read(
      `
      MATCH (:Application {id: $applicationId})-[:HAS_VERSION]->(av:ApplicationVersion)
      RETURN count(av) AS value
      `,
      { applicationId },
    );
    expect(Number(avCount.records[0]?.get('value') ?? 0)).toBe(0);
  });
});
