import type { ViewEdge, ViewNode } from '@stellode/models';
import { getLayoutedElements } from './layout-diagram';
import type { LayoutDirection } from './layout-direction';
import { projectUnitDiagramVisibleGraph } from './project-unit-diagram-visible-graph';
import type { UnitDiagramInstanceFilter } from './unit-diagram-instance-filter-types';

export const layoutUnitDiagram = async (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  filter: UnitDiagramInstanceFilter,
  direction: LayoutDirection,
): Promise<{ nodes: ViewNode[]; edges: ViewEdge[] }> => {
  const visible = projectUnitDiagramVisibleGraph(nodes, edges, filter);
  return getLayoutedElements(visible.nodes, visible.edges, direction);
};
