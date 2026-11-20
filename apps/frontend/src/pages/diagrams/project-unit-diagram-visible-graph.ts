import type { ViewEdge, ViewNode } from '@stellode/models';
import { applyUnitDiagramInstanceFilterPhase1 } from './apply-unit-diagram-instance-filter-phase1';
import { applyUnitDiagramInstanceFilterPhase2 } from './apply-unit-diagram-instance-filter-phase2';
import { filterUnitDiagramCanvas } from './filter-unit-diagram-canvas';
import { groupNodesByApplication } from './group-nodes-by-application';
import type { UnitDiagramInstanceFilter } from './unit-diagram-instance-filter-types';

export const projectUnitDiagramVisibleGraph = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  filter: UnitDiagramInstanceFilter,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const phase1 = applyUnitDiagramInstanceFilterPhase1(nodes, edges, filter);
  const grouped = groupNodesByApplication(phase1.nodes, phase1.edges);
  const phase2 = applyUnitDiagramInstanceFilterPhase2(grouped.nodes, grouped.edges, filter);
  return filterUnitDiagramCanvas(phase2.nodes, phase2.edges);
};
