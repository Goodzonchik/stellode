import type { ArchitectureGraph, ArchitectureRelationship, Label, Node } from '@stellode/models';
import type { GraphNode, GraphQueryResult } from '../../neo4j/neo4j.service';

interface DiagramEdgeRow {
  id?: string | null;
  from: string;
  to: string;
  label: string;
  properties?: Record<string, unknown> | null;
}

const isDiagramNode = (value: unknown): value is GraphNode =>
  typeof value === 'object' &&
  value !== null &&
  'properties' in value &&
  'label' in value &&
  typeof (value as GraphNode).label === 'string' &&
  !('from' in value);

const isDiagramEdgeRow = (value: unknown): value is DiagramEdgeRow =>
  typeof value === 'object' &&
  value !== null &&
  'from' in value &&
  'to' in value &&
  typeof (value as DiagramEdgeRow).from === 'string' &&
  typeof (value as DiagramEdgeRow).to === 'string' &&
  typeof (value as DiagramEdgeRow).label === 'string';

const diagramNodeFromGraphNode = (vertex: GraphNode): Node => {
  const props = vertex.properties;
  const label = vertex.label as Label;
  const nodeData: Node = {
    id: vertex.id,
    labels:
      props.labels !== undefined && Array.isArray(props.labels)
        ? (props.labels as Label[])
        : [label],
    type: props.type as string,
    name: typeof props.name === 'string' ? props.name : '',
  };
  if (props.isDependency !== undefined) {
    nodeData.isDependency = props.isDependency as boolean;
  }
  if (props.version !== undefined) {
    nodeData.version = props.version as string;
  }
  if (props.versionNumber !== undefined) {
    nodeData.versionNumber = Number(props.versionNumber);
  }
  if (props.status !== undefined) {
    nodeData.status = props.status as string;
  }
  if (props.unitId !== undefined && props.unitId !== null) {
    nodeData.unitId = String(props.unitId);
  }
  if (props.applicationId !== undefined && props.applicationId !== null) {
    nodeData.applicationId = String(props.applicationId);
  }
  return nodeData;
};

const edgeRowKey = (rel: DiagramEdgeRow): string => {
  const properties = rel.properties ?? {};
  const propId =
    typeof properties.id === 'string' && properties.id.length > 0 ? properties.id : null;
  const explicitId = typeof rel.id === 'string' && rel.id.length > 0 ? rel.id : null;
  if (propId !== null) return propId;
  if (explicitId !== null) return explicitId;
  const applicationId =
    typeof properties.applicationId === 'string' && properties.applicationId.length > 0
      ? properties.applicationId
      : null;
  const status =
    typeof properties.status === 'string' && properties.status.length > 0
      ? properties.status
      : null;
  const suffix = [applicationId, status].filter((part): part is string => part !== null).join(':');
  return suffix.length > 0
    ? `${rel.label}:${rel.from}->${rel.to}:${suffix}`
    : `${rel.label}:${rel.from}->${rel.to}`;
};

type VersionParentKind = 'Component' | 'Application';

const versionChildLabel = (parent: VersionParentKind): Label =>
  parent === 'Component' ? 'ComponentVersion' : 'ApplicationVersion';

const versionLinkPair = (
  rel: ArchitectureRelationship,
  nodes: ReadonlyMap<string, Node>,
  parentKind: VersionParentKind,
): { parent: Node; version: Node } | undefined => {
  const childLabel = versionChildLabel(parentKind);
  const left = nodes.get(rel.from);
  const right = nodes.get(rel.to);
  if (left === undefined || right === undefined) return undefined;
  if (left.labels.includes(parentKind) && right.labels.includes(childLabel)) {
    return { parent: left, version: right };
  }
  if (right.labels.includes(parentKind) && left.labels.includes(childLabel)) {
    return { parent: right, version: left };
  }
  return undefined;
};

const applyDraftSummary = (parent: Node, version: Node): void => {
  parent.draftVersion = version.version ?? version.name;
  parent.draftVersionNumber = version.versionNumber;
};

const applyActiveSummary = (parent: Node, version: Node): void => {
  const current = parent.actualVersionNumber ?? -1;
  const next = version.versionNumber ?? -1;
  if (next < current) return;
  parent.actualVersion = version.version ?? version.name;
  parent.actualVersionNumber = version.versionNumber;
};

const applyVersionSummaries = (
  nodes: ReadonlyMap<string, Node>,
  relationships: ReadonlyMap<string, ArchitectureRelationship>,
): void => {
  for (const rel of relationships.values()) {
    if (rel.type !== 'HAS_VERSION' && rel.type !== 'HAS_DRAFT') continue;
    for (const parentKind of ['Component', 'Application'] as const) {
      const pair = versionLinkPair(rel, nodes, parentKind);
      if (pair === undefined) continue;
      if (rel.type === 'HAS_DRAFT') applyDraftSummary(pair.parent, pair.version);
      else applyActiveSummary(pair.parent, pair.version);
    }
  }
};

export const graphQueryResultToArchitectureGraph = (
  queryResult: GraphQueryResult,
): ArchitectureGraph => {
  const nodesMap = new Map<string, Node>();
  const relationshipsMap = new Map<string, ArchitectureRelationship>();

  for (const record of queryResult.records) {
    const rawNode = record.get('node');
    if (rawNode !== null && isDiagramNode(rawNode) && !nodesMap.has(rawNode.id)) {
      nodesMap.set(rawNode.id, diagramNodeFromGraphNode(rawNode));
    }
  }

  for (const record of queryResult.records) {
    const rel = record.get('relationship');
    if (rel === null || rel === undefined) continue;
    if (!isDiagramEdgeRow(rel)) continue;
    const relKey = edgeRowKey(rel);
    if (relationshipsMap.has(relKey)) continue;
    relationshipsMap.set(relKey, {
      id: relKey,
      from: rel.from,
      to: rel.to,
      type: rel.label,
      properties: rel.properties ?? {},
    });
  }

  applyVersionSummaries(nodesMap, relationshipsMap);

  return {
    nodes: Array.from(nodesMap.values()),
    relationships: Array.from(relationshipsMap.values()),
  };
};

export const mergeGraphDiagramResults = (
  primary: GraphQueryResult,
  secondary: GraphQueryResult,
): GraphQueryResult => ({
  records: [...primary.records, ...secondary.records],
});
