import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

export type HoverPathMode = 'unit' | 'cross-unit';

export type HoverPathIds = {
  readonly nodeIds: ReadonlySet<string>;
  readonly edgeIds: ReadonlySet<string>;
};

const usesOrMaintains = new Set(['USES_COMPONENT_VERSION', 'MAINTAINS']);

const emptyPath = (): HoverPathIds => ({
  nodeIds: new Set<string>(),
  edgeIds: new Set<string>(),
});

const isVisibleNode = (node: ViewNode): boolean => node.hidden !== true;

const isVisibleEdge = (edge: ViewEdge): boolean => edge.hidden !== true;

const nodeKind = (node: ViewNode): string =>
  node.type === 'group' ? 'application' : normalizeDiagramNodeTypeKey(node.data.type);

const otherEnd = (edge: ViewEdge, nodeId: string): string =>
  edge.source === nodeId ? edge.target : edge.source;

const incidentVisibleEdges = (
  nodeId: string,
  edges: readonly ViewEdge[],
): readonly ViewEdge[] =>
  edges.filter(
    (edge) =>
      isVisibleEdge(edge) && (edge.source === nodeId || edge.target === nodeId),
  );

const addEdgeAndNeighbor = (
  edge: ViewEdge,
  fromId: string,
  nodeIds: Set<string>,
  edgeIds: Set<string>,
): void => {
  edgeIds.add(edge.id);
  nodeIds.add(otherEnd(edge, fromId));
};

const nodesByIdMap = (nodes: readonly ViewNode[]): Map<string, ViewNode> =>
  new Map(nodes.filter(isVisibleNode).map((node) => [node.id, node]));

const collectCrossUnitPath = (
  hoveredNodeId: string,
  edges: readonly ViewEdge[],
): HoverPathIds => {
  const nodeIds = new Set<string>([hoveredNodeId]);
  const edgeIds = new Set<string>();
  for (const edge of incidentVisibleEdges(hoveredNodeId, edges)) {
    if (edge.relationshipType !== 'CROSS_UNIT_LINK') continue;
    addEdgeAndNeighbor(edge, hoveredNodeId, nodeIds, edgeIds);
  }
  return { nodeIds, edgeIds };
};

const addParentApplication = (
  node: ViewNode | undefined,
  nodeIds: Set<string>,
): void => {
  if (node?.parentId) nodeIds.add(node.parentId);
};

const collectComponentPath = (
  hoveredId: string,
  nodesById: Map<string, ViewNode>,
  edges: readonly ViewEdge[],
): HoverPathIds => {
  const nodeIds = new Set<string>([hoveredId]);
  const edgeIds = new Set<string>();
  addParentApplication(nodesById.get(hoveredId), nodeIds);
  for (const edge of incidentVisibleEdges(hoveredId, edges)) {
    if (!usesOrMaintains.has(edge.relationshipType)) continue;
    addEdgeAndNeighbor(edge, hoveredId, nodeIds, edgeIds);
  }
  for (const featureId of [...nodeIds]) {
    const feature = nodesById.get(featureId);
    if (!feature || nodeKind(feature) !== 'feature') continue;
    for (const edge of incidentVisibleEdges(featureId, edges)) {
      if (edge.relationshipType !== 'AGGREGATES') continue;
      addEdgeAndNeighbor(edge, featureId, nodeIds, edgeIds);
    }
  }
  return { nodeIds, edgeIds };
};

const collectFeaturePath = (
  hoveredId: string,
  nodesById: Map<string, ViewNode>,
  edges: readonly ViewEdge[],
): HoverPathIds => {
  const nodeIds = new Set<string>([hoveredId]);
  const edgeIds = new Set<string>();
  for (const edge of incidentVisibleEdges(hoveredId, edges)) {
    const rel = edge.relationshipType;
    if (rel !== 'USES_COMPONENT_VERSION' && rel !== 'AGGREGATES') continue;
    addEdgeAndNeighbor(edge, hoveredId, nodeIds, edgeIds);
  }
  for (const id of [...nodeIds]) {
    const neighbor = nodesById.get(id);
    if (!neighbor || !isComponentLikeType(nodeKind(neighbor))) continue;
    addParentApplication(neighbor, nodeIds);
  }
  return { nodeIds, edgeIds };
};

const collectServicePath = (
  hoveredId: string,
  edges: readonly ViewEdge[],
): HoverPathIds => {
  const nodeIds = new Set<string>([hoveredId]);
  const edgeIds = new Set<string>();
  for (const edge of incidentVisibleEdges(hoveredId, edges)) {
    if (edge.relationshipType !== 'AGGREGATES') continue;
    addEdgeAndNeighbor(edge, hoveredId, nodeIds, edgeIds);
  }
  return { nodeIds, edgeIds };
};

const collectTeamPath = (
  hoveredId: string,
  nodesById: Map<string, ViewNode>,
  edges: readonly ViewEdge[],
): HoverPathIds => {
  const nodeIds = new Set<string>([hoveredId]);
  const edgeIds = new Set<string>();
  for (const edge of incidentVisibleEdges(hoveredId, edges)) {
    if (edge.relationshipType !== 'MAINTAINS') continue;
    addEdgeAndNeighbor(edge, hoveredId, nodeIds, edgeIds);
  }
  for (const id of [...nodeIds]) {
    const neighbor = nodesById.get(id);
    if (!neighbor || !isComponentLikeType(nodeKind(neighbor))) continue;
    addParentApplication(neighbor, nodeIds);
  }
  return { nodeIds, edgeIds };
};

const collectApplicationPath = (
  hoveredId: string,
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): HoverPathIds => {
  const nodeIds = new Set<string>([hoveredId]);
  const edgeIds = new Set<string>();
  const children = nodes.filter(
    (node) => isVisibleNode(node) && node.parentId === hoveredId,
  );
  for (const child of children) {
    nodeIds.add(child.id);
    for (const edge of incidentVisibleEdges(child.id, edges)) {
      if (!usesOrMaintains.has(edge.relationshipType)) continue;
      addEdgeAndNeighbor(edge, child.id, nodeIds, edgeIds);
    }
  }
  return { nodeIds, edgeIds };
};

const collectUnitPath = (
  hoveredNodeId: string,
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): HoverPathIds => {
  const nodesById = nodesByIdMap(nodes);
  const hovered = nodesById.get(hoveredNodeId);
  if (!hovered) return emptyPath();
  const kind = nodeKind(hovered);
  if (isComponentLikeType(kind)) return collectComponentPath(hoveredNodeId, nodesById, edges);
  if (kind === 'feature') return collectFeaturePath(hoveredNodeId, nodesById, edges);
  if (kind === 'service') return collectServicePath(hoveredNodeId, edges);
  if (kind === 'team') return collectTeamPath(hoveredNodeId, nodesById, edges);
  if (kind === 'application') {
    return collectApplicationPath(hoveredNodeId, nodes, edges);
  }
  return emptyPath();
};

export const collectHoverPathIds = (
  hoveredNodeId: string,
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  mode: HoverPathMode,
): HoverPathIds => {
  if (mode === 'cross-unit') return collectCrossUnitPath(hoveredNodeId, edges);
  return collectUnitPath(hoveredNodeId, nodes, edges);
};
