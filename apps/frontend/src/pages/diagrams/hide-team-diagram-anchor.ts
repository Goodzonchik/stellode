import type { ViewEdge, ViewNode } from '@stellode/models';
import { UnitDiagramNodeKind, viewNodeUnitKind } from './unit-diagram-type-visibility';

export const hideTeamDiagramAnchor = (
  nodes: ViewNode[],
  edges: ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const visibleById = new Map<string, boolean>();
  for (const node of nodes) {
    const kind = viewNodeUnitKind(node);
    visibleById.set(node.id, kind !== UnitDiagramNodeKind.Team);
  }
  const nextNodes = nodes.map((node) => ({
    ...node,
    hidden: !(visibleById.get(node.id) ?? true),
  }));
  const nextEdges = edges.map((edge) => ({
    ...edge,
    hidden: !((visibleById.get(edge.source) ?? false) && (visibleById.get(edge.target) ?? false)),
  }));
  return { nodes: nextNodes, edges: nextEdges };
};
