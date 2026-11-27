import neo4j, { type Driver } from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

const uri = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const user = process.env.NEO4J_USER ?? 'neo4j';
const password = process.env.NEO4J_PASSWORD ?? 'stellode';

describe('Neo4jService.writeInTransaction (integration)', () => {
  let driver: Driver;
  let service: Neo4jService;
  const marker = `tx-it-${Date.now()}`;

  beforeAll(() => {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    service = new Neo4jService(driver);
  });

  afterAll(async () => {
    await service.write(
      `MATCH (n:TxIntegrationTest {marker: $marker}) DETACH DELETE n`,
      { marker },
    );
    await driver.close();
  });

  beforeEach(async () => {
    await service.write(
      `MATCH (n:TxIntegrationTest {marker: $marker}) DETACH DELETE n`,
      { marker },
    );
  });

  it('commits all writes from one transaction', async () => {
    await service.writeInTransaction(async (run) => {
      await run(
        `CREATE (a:TxIntegrationTest {marker: $marker, id: $id1, kind: 'a'})`,
        { marker, id1: `${marker}-a` },
      );
      await run(
        `CREATE (b:TxIntegrationTest {marker: $marker, id: $id2, kind: 'b'})`,
        { marker, id2: `${marker}-b` },
      );
      return true;
    });

    const result = await service.read(
      `MATCH (n:TxIntegrationTest {marker: $marker}) RETURN count(n) AS value`,
      { marker },
    );
    expect(Number(result.records[0]?.get('value') ?? 0)).toBe(2);
  });

  it('rolls back partial writes when work throws mid-op', async () => {
    await expect(
      service.writeInTransaction(async (run) => {
        await run(
          `CREATE (a:TxIntegrationTest {marker: $marker, id: $id, kind: 'orphan'})`,
          { marker, id: `${marker}-orphan` },
        );
        throw new Error('forced mid-op failure');
      }),
    ).rejects.toThrow(/forced mid-op failure/);

    const result = await service.read(
      `MATCH (n:TxIntegrationTest {marker: $marker}) RETURN count(n) AS value`,
      { marker },
    );
    expect(Number(result.records[0]?.get('value') ?? 0)).toBe(0);
  });
});
