import type { ViewEdge, ViewNode } from '@stellode/models';
import type { UnitDiagramInstanceFilter } from './unit-diagram-instance-filter-types';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';
import { keepEdgesAmongNodes } from './keep-edges-among-nodes';
import { unitDiagramFilterNodeKind } from './unit-diagram-filter-node-kind';

const isHiddenByPhase1 = (
  node: ViewNode,
  filter: UnitDiagramInstanceFilter,
): boolean => {
  const kind = unitDiagramFilterNodeKind(node);
  if (kind === null) return false;
  if (kind === UnitDiagramFilterKind.App) return false;
  return filter.hiddenIds[kind].has(node.id);
};

export const applyUnitDiagramInstanceFilterPhase1 = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  filter: UnitDiagramInstanceFilter,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const nextNodes = nodes.filter((node) => !isHiddenByPhase1(node, filter));
  const ids = new Set(nextNodes.map((node) => node.id));
  return { nodes: nextNodes, edges: keepEdgesAmongNodes(edges, ids) };
};
