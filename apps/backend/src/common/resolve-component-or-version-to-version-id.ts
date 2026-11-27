import type { Neo4jRun, Neo4jService } from '../neo4j/neo4j.service';

const readGraphString = async (
  execute: Neo4jRun,
  query: string,
  params: Record<string, unknown>,
): Promise<string | null> => {
  const result = await execute(query, params);
  const rec = result.records[0];
  if (!rec) return null;
  const value = rec.get('value') ?? rec.get('id');
  if (typeof value === 'string' && value.length > 0) return value;
  if (value === null || value === undefined) return null;
  const asString = `${value}`;
  return asString.length > 0 && asString !== 'undefined' ? asString : null;
};

export const resolveComponentOrVersionToVersionId = async (
  neo4jService: Neo4jService,
  nodeOrCvId: string,
  run?: Neo4jRun,
): Promise<string | null> => {
  const execute: Neo4jRun = run ?? ((query, parameters) => neo4jService.read(query, parameters));
  const params = { id: nodeOrCvId };
  const direct = await readGraphString(
    execute,
    `MATCH (cv:ComponentVersion {id: $id}) RETURN cv.id AS value LIMIT 1`,
    params,
  );
  if (direct) return direct;
  const fromDraft = await readGraphString(
    execute,
    `MATCH (c:Component {id: $id})-[:HAS_DRAFT]->(cv:ComponentVersion)
     RETURN cv.id AS value ORDER BY cv.id LIMIT 1`,
    params,
  );
  if (fromDraft) return fromDraft;
  return await readGraphString(
    execute,
    `MATCH (c:Component {id: $id})-[:HAS_VERSION]->(cv:ComponentVersion)
     RETURN cv.id AS value ORDER BY cv.versionNumber DESC LIMIT 1`,
    params,
  );
};
