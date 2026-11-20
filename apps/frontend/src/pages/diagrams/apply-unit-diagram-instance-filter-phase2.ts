import type { ViewEdge, ViewNode } from '@stellode/models';
import type { UnitDiagramInstanceFilter } from './unit-diagram-instance-filter-types';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';
import { keepEdgesAmongNodes } from './keep-edges-among-nodes';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const isApplicationNode = (node: ViewNode): boolean => {
  const key = normalizeDiagramNodeTypeKey(node.data.type);
  return key === 'app' || key === 'application';
};

const isHiddenByPhase2 = (
  node: ViewNode,
  hiddenApps: ReadonlySet<string>,
): boolean => {
  if (hiddenApps.has(node.id) && isApplicationNode(node)) return true;
  if (node.parentId !== undefined && hiddenApps.has(node.parentId)) return true;
  return false;
};

export const applyUnitDiagramInstanceFilterPhase2 = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  filter: UnitDiagramInstanceFilter,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const hiddenApps = filter.hiddenIds[UnitDiagramFilterKind.App];
  const nextNodes = nodes.filter((node) => !isHiddenByPhase2(node, hiddenApps));
  const ids = new Set(nextNodes.map((node) => node.id));
  return { nodes: nextNodes, edges: keepEdgesAmongNodes(edges, ids) };
};
