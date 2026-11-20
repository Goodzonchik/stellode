import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

export const UnitDiagramNodeKind = {
  Unit: 'unit',
  Team: 'team',
  Service: 'service',
  Feature: 'feature',
  App: 'app',
  Component: 'component',
} as const;

export type UnitDiagramNodeKind =
  (typeof UnitDiagramNodeKind)[keyof typeof UnitDiagramNodeKind];

export const defaultUnitDiagramVisibility: Record<UnitDiagramNodeKind, boolean> = {
  [UnitDiagramNodeKind.Unit]: true,
  [UnitDiagramNodeKind.Team]: true,
  [UnitDiagramNodeKind.Service]: true,
  [UnitDiagramNodeKind.Feature]: true,
  [UnitDiagramNodeKind.App]: true,
  [UnitDiagramNodeKind.Component]: true,
};

export const viewNodeUnitKind = (node: ViewNode): UnitDiagramNodeKind | null => {
  const kind = normalizeDiagramNodeTypeKey(node.data.type);
  if (isComponentLikeType(kind)) return UnitDiagramNodeKind.Component;
  if (kind === 'application') return UnitDiagramNodeKind.App;
  if (kind === 'unit') return UnitDiagramNodeKind.Unit;
  if (kind === 'team') return UnitDiagramNodeKind.Team;
  if (kind === 'service') return UnitDiagramNodeKind.Service;
  if (kind === 'feature') return UnitDiagramNodeKind.Feature;
  if (kind === 'app') return UnitDiagramNodeKind.App;
  return null;
};

export const applyUnitDiagramVisibility = (
  nodes: ViewNode[],
  edges: ViewEdge[],
  visibility: Record<UnitDiagramNodeKind, boolean>,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const appsVisible = Boolean(visibility[UnitDiagramNodeKind.App]);
  const visibleById = new Map<string, boolean>();
  for (const node of nodes) {
    const kind = viewNodeUnitKind(node);
    const show = (() => {
      if (kind === UnitDiagramNodeKind.Unit) return false;
      if (kind === null) return true;
      if (kind === UnitDiagramNodeKind.Component && !appsVisible) return false;
      return Boolean(visibility[kind]);
    })();
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
