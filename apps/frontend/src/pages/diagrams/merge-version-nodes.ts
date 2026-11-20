import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

type NodeMap = Record<string, ViewNode>;
type IdMap = Record<string, string>;
type MergeRelationshipRole = 'active' | 'draft' | 'neutral';

export type MergeNodesConfig = {
  mergedNodeTypes: readonly string[];
  relationshipRoles: Readonly<Record<string, MergeRelationshipRole>>;
};

export const defaultVersionMergeConfig: MergeNodesConfig = {
  mergedNodeTypes: ['applicationVersion', 'componentVersion', 'featureVersion'],
  relationshipRoles: {
    HAS_VERSION: 'active',
    HAS_DRAFT: 'draft',
  },
};

export const applicationVersionOnlyMergeConfig: MergeNodesConfig = {
  mergedNodeTypes: ['applicationVersion'],
  relationshipRoles: defaultVersionMergeConfig.relationshipRoles,
};

export const overviewVersionMergeConfig: MergeNodesConfig = {
  mergedNodeTypes: ['applicationVersion', 'featureVersion'],
  relationshipRoles: defaultVersionMergeConfig.relationshipRoles,
};

const isMergedNode = (n: ViewNode | undefined, mergedNodeTypes: ReadonlySet<string>) =>
  Boolean(n && mergedNodeTypes.has(normalizeDiagramNodeTypeKey(n.data.type)));
const toNodeMap = (nodes: ViewNode[]): NodeMap => Object.fromEntries(nodes.map((n) => [n.id, n]));
const toVersionPair = (
  edge: ViewEdge,
  nodeMap: NodeMap,
  mergedNodeTypes: ReadonlySet<string>,
  relationshipRoles: Readonly<Record<string, MergeRelationshipRole>>,
): { parentId: string; versionId: string; relationshipRole: MergeRelationshipRole } | null => {
  const relationshipRole = relationshipRoles[edge.relationshipType];
  if (!relationshipRole) return null;
  const source = nodeMap[edge.source];
  const target = nodeMap[edge.target];
  const sourceIsVersion = isMergedNode(source, mergedNodeTypes);
  const targetIsVersion = isMergedNode(target, mergedNodeTypes);
  if (sourceIsVersion === targetIsVersion) return null;
  return sourceIsVersion
    ? { parentId: edge.target, versionId: edge.source, relationshipRole }
    : { parentId: edge.source, versionId: edge.target, relationshipRole };
};

const pickLatest = (items: ViewNode[]): ViewNode | undefined => {
  const clean = items.filter((n): n is ViewNode => n !== undefined && n !== null);
  if (clean.length === 0) return undefined;
  return [...clean].sort((a, b) => {
    const an = a.data.actualVersionNumber ?? -1;
    const bn = b.data.actualVersionNumber ?? -1;
    if (bn !== an) return bn - an;
    const as = String(a.data.actualVersion ?? '');
    const bs = String(b.data.actualVersion ?? '');
    return bs.localeCompare(as, undefined, { numeric: true });
  })[0];
};

const versionStringOf = (node: ViewNode | undefined): string | undefined =>
  node?.data.actualVersion ?? node?.data.draftVersion;

const versionNumberOf = (node: ViewNode | undefined): number | undefined =>
  node?.data.actualVersionNumber ?? node?.data.draftVersionNumber;

const withVersionInfo = (node: ViewNode, active?: ViewNode, draft?: ViewNode): ViewNode => ({
  ...node,
  data: {
    ...node.data,
    actualVersion: versionStringOf(active) ?? node.data.actualVersion,
    actualVersionNumber: versionNumberOf(active) ?? node.data.actualVersionNumber,
    draftVersion:
      draft !== undefined
        ? (versionStringOf(draft) ?? node.data.draftVersion)
        : node.data.draftVersion,
    draftVersionNumber:
      draft !== undefined
        ? (versionNumberOf(draft) ?? node.data.draftVersionNumber)
        : node.data.draftVersionNumber,
  },
});

export function mergeVersionNodes(
  nodes: ViewNode[],
  edges: ViewEdge[],
  config: MergeNodesConfig = defaultVersionMergeConfig,
) {
  const mergedNodeTypes = new Set(config.mergedNodeTypes);
  const nodeMap = toNodeMap(nodes);
  const versionEdges = edges
    .map((edge) => toVersionPair(edge, nodeMap, mergedNodeTypes, config.relationshipRoles))
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
  const replacementById: IdMap = Object.fromEntries(
    nodes.map((n) => [n.id, versionEdges.find((e) => e.versionId === n.id)?.parentId ?? n.id]),
  );
  const pushVersion = (
    acc: Record<string, { active: ViewNode[]; draft: ViewNode[] }>,
    parentId: string,
    versionId: string,
    role: MergeRelationshipRole,
  ): Record<string, { active: ViewNode[]; draft: ViewNode[] }> => {
    const vn = nodeMap[versionId];
    if (vn === undefined) return acc;
    const cur = acc[parentId] ?? { active: [], draft: [] };
    const next =
      role === 'active'
        ? { active: [...cur.active, vn], draft: cur.draft }
        : { active: cur.active, draft: [...cur.draft, vn] };
    return { ...acc, [parentId]: next };
  };
  const byParent = versionEdges.reduce<Record<string, { active: ViewNode[]; draft: ViewNode[] }>>(
    (acc, e) => pushVersion(acc, e.parentId, e.versionId, e.relationshipRole),
    {},
  );
  const keptNodes = nodes.filter(
    (n) => !(isMergedNode(n, mergedNodeTypes) && versionEdges.some((e) => e.versionId === n.id)),
  );
  const mergedNodes = keptNodes.map((n) =>
    withVersionInfo(
      n,
      pickLatest(byParent[n.id]?.active ?? []),
      pickLatest(byParent[n.id]?.draft ?? []),
    ),
  );
  const remappedEdges = edges.map((e) => ({
    ...e,
    source: replacementById[e.source],
    target: replacementById[e.target],
  }));
  const edgeByKey = new Map<string, ViewEdge>();
  for (const e of remappedEdges) {
    if (e.source === e.target) continue;
    const key = mergedEdgeKey(e);
    const next: ViewEdge = { ...e, id: key, diagramAnomaly: Boolean(e.diagramAnomaly) };
    const prev = edgeByKey.get(key);
    edgeByKey.set(key, prev ? combineMergedEdges(prev, next) : next);
  }
  const dedupedEdges = [...edgeByKey.values()];
  return { nodes: mergedNodes, edges: dedupedEdges };
}

const mergedEdgeKey = (edge: ViewEdge): string => {
  const base = `${edge.source}-${edge.target}-${edge.relationshipType}`;
  return edge.applicationId !== undefined ? `${base}-${edge.applicationId}` : base;
};

const pickApplicationStatus = (prev?: string, next?: string): string | undefined => {
  if (prev === 'active' || next === 'active') return 'active';
  return next ?? prev;
};

const combineMergedEdges = (prev: ViewEdge, next: ViewEdge): ViewEdge => {
  const status = pickApplicationStatus(prev.status, next.status);
  return {
    ...next,
    diagramAnomaly: Boolean(prev.diagramAnomaly || next.diagramAnomaly),
    ...(status !== undefined ? { status } : {}),
  };
};
