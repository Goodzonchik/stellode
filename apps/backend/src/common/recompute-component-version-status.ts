import {
  deriveComponentVersionStatus,
  isApplicationComponentStatus,
  VersionStatus,
  type ApplicationComponentStatus,
  type VersionStatus as VersionStatusType,
} from '@stellode/models';
import type { Neo4jRun, Neo4jService } from '../neo4j/neo4j.service';

export type ComponentVersionStatusChange = {
  readonly componentVersionId: string;
  readonly fromStatus: VersionStatusType;
  readonly toStatus: VersionStatusType;
};

type EdgeRow = {
  readonly cvId: string;
  readonly currentStatus: string;
  readonly edgeStatus: string | null;
};

const parseCurrentStatus = (raw: string): VersionStatusType => {
  if (raw === VersionStatus.Draft) return VersionStatus.Draft;
  if (raw === VersionStatus.Active) return VersionStatus.Active;
  if (raw === VersionStatus.Deprecated) return VersionStatus.Deprecated;
  return VersionStatus.Unactive;
};

const groupEdgeStatuses = (rows: readonly EdgeRow[]): Map<string, {
  current: VersionStatusType;
  edges: ApplicationComponentStatus[];
}> => {
  const byCv = new Map<string, { current: VersionStatusType; edges: ApplicationComponentStatus[] }>();
  for (const row of rows) {
    const existing = byCv.get(row.cvId) ?? {
      current: parseCurrentStatus(row.currentStatus),
      edges: [],
    };
    if (row.edgeStatus !== null && isApplicationComponentStatus(row.edgeStatus)) {
      existing.edges = [...existing.edges, row.edgeStatus];
    }
    byCv.set(row.cvId, existing);
  }
  return byCv;
};

export const recomputeComponentVersionStatuses = async (
  neo4jService: Neo4jService,
  componentVersionIds: readonly string[],
  run?: Neo4jRun,
): Promise<ComponentVersionStatusChange[]> => {
  const ids = [...new Set(componentVersionIds.filter((id) => id.length > 0))];
  if (ids.length === 0) return [];

  const query = `
    UNWIND $ids AS cvId
    MATCH (cv:ComponentVersion {id: cvId})
    OPTIONAL MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)
    RETURN cv.id AS cvId, cv.status AS currentStatus, hc.status AS edgeStatus
  `;
  const execute: Neo4jRun = run ?? ((q, p) => neo4jService.read(q, p));
  const write: Neo4jRun = run ?? ((q, p) => neo4jService.write(q, p));
  const result = await execute(query, { ids });
  const rows: EdgeRow[] = result.records.map((record) => ({
    cvId: String(record.get('cvId') ?? ''),
    currentStatus: String(record.get('currentStatus') ?? ''),
    edgeStatus: (() => {
      const raw = record.get('edgeStatus');
      return raw === null || raw === undefined ? null : String(raw);
    })(),
  })).filter((row) => row.cvId.length > 0);

  const grouped = groupEdgeStatuses(rows);
  const changes: ComponentVersionStatusChange[] = [];

  for (const [componentVersionId, { current, edges }] of grouped) {
    const next = deriveComponentVersionStatus(current, edges);
    if (next === current) continue;
    await write(
      `MATCH (cv:ComponentVersion {id: $id}) SET cv.status = $status`,
      { id: componentVersionId, status: next },
    );
    changes.push({
      componentVersionId,
      fromStatus: current,
      toStatus: next,
    });
  }

  return changes;
};
