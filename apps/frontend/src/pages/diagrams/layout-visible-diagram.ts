import type { ViewEdge, ViewNode } from '@stellode/models';
import {
  applyCrossUnitBridgeVisibility,
  type CrossUnitBridgeVisibilityOptions,
} from './apply-cross-unit-bridge-visibility';
import { filterBridgeUnitStructuralEdges } from './filter-bridge-unit-structural-edges';
import { filterUnitDiagramCanvas } from './filter-unit-diagram-canvas';
import { groupBridgeNodesByUnit } from './group-bridge-nodes-by-unit';
import { groupNodesByApplication } from './group-nodes-by-application';
import { getLayoutedElements } from './layout-diagram';
import type { LayoutDirection } from './layout-direction';
import { orientCrossUnitBridgeForLayout } from './orient-cross-unit-bridge-for-layout';

const withoutHidden = <T extends { hidden?: boolean }>(items: readonly T[]): T[] =>
  items
    .filter((item) => !item.hidden)
    .map((item) => {
      const { hidden, ...rest } = item;
      void hidden;
      return rest as T;
    });

export type CrossUnitBridgeLayout = {
  readonly unitIdA: string;
  readonly unitIdB: string;
};

export type LayoutVisibleDiagramOptions = {
  filterUnitCanvas?: boolean;
  crossUnitBridge?: CrossUnitBridgeLayout;
  crossUnitBridgeVisibility?: CrossUnitBridgeVisibilityOptions;
};

const withCrossUnitBridgeNesting = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  bridge: CrossUnitBridgeLayout | undefined,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  if (bridge === undefined) return { nodes: [...nodes], edges: [...edges] };
  const nested = groupBridgeNodesByUnit(nodes, edges, bridge.unitIdA, bridge.unitIdB);
  return {
    nodes: nested.nodes,
    edges: filterBridgeUnitStructuralEdges(nested.edges),
  };
};

const withCrossUnitBridgeVisibility = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  visibility: CrossUnitBridgeVisibilityOptions | undefined,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  if (visibility === undefined) return { nodes: [...nodes], edges: [...edges] };
  return applyCrossUnitBridgeVisibility(nodes, edges, visibility);
};

const withCrossUnitBridgeOrient = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  bridge: CrossUnitBridgeLayout | undefined,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  if (bridge === undefined) return { nodes: [...nodes], edges: [...edges] };
  return orientCrossUnitBridgeForLayout(nodes, edges, bridge.unitIdA, bridge.unitIdB);
};

export const layoutVisibleDiagram = async (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  direction: LayoutDirection,
  options: LayoutVisibleDiagramOptions = {},
): Promise<{ nodes: ViewNode[]; edges: ViewEdge[] }> => {
  const grouped = groupNodesByApplication(withoutHidden(nodes), withoutHidden(edges));
  const canvas = options.filterUnitCanvas
    ? filterUnitDiagramCanvas(grouped.nodes, grouped.edges)
    : grouped;
  const bridged = withCrossUnitBridgeNesting(
    canvas.nodes,
    canvas.edges,
    options.crossUnitBridge,
  );
  const filtered = withCrossUnitBridgeVisibility(
    bridged.nodes,
    bridged.edges,
    options.crossUnitBridgeVisibility,
  );
  const oriented = withCrossUnitBridgeOrient(
    filtered.nodes,
    filtered.edges,
    options.crossUnitBridge,
  );
  return getLayoutedElements(oriented.nodes, oriented.edges, direction);
};
