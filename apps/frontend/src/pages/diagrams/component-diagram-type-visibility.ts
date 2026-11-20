import type { ViewEdge, ViewNode } from '@stellode/models';
import {
  UnitDiagramNodeKind,
  viewNodeUnitKind,
} from './unit-diagram-type-visibility';

export const componentDiagramLegendToggleOrder: readonly Exclude<
  UnitDiagramNodeKind,
  'unit' | 'component'
>[] = [
  UnitDiagramNodeKind.Team,
  UnitDiagramNodeKind.Service,
  UnitDiagramNodeKind.Feature,
  UnitDiagramNodeKind.App,
];

export const applyComponentDiagramVisibility = (
  nodes: ViewNode[],
  edges: ViewEdge[],
  visibility: Record<UnitDiagramNodeKind, boolean>,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const visibleById = new Map<string, boolean>();
  for (const node of nodes) {
    const kind = viewNodeUnitKind(node);
    const show =
      kind === UnitDiagramNodeKind.Component ? true : kind === null ? true : Boolean(visibility[kind]);
    visibleById.set(node.id, show);
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
