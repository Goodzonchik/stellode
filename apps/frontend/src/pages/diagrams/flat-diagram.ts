import type { ViewEdge, ViewNode } from '@stellode/models';
import type { UnitDiagramNodeKind } from './unit-diagram-type-visibility';

export type FlatDiagram = { nodes: ViewNode[]; edges: ViewEdge[] };

export type UnitVisibilityState = Record<UnitDiagramNodeKind, boolean>;

export type ApplyVisibility = (
  nodes: ViewNode[],
  edges: ViewEdge[],
  visibility: UnitVisibilityState,
) => FlatDiagram;
