import type { ViewEdge, ViewNode } from '@stellode/models';
import { isBridgeComponentLikeType } from './is-bridge-component-like-type';
import { isBridgeNestableUnderUnit } from './is-bridge-nestable-under-unit';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { orderBridgeNodesForReactFlow } from './order-bridge-nodes-for-react-flow';
import { resolveBridgeNodeUnitId } from './resolve-bridge-node-unit-id';
import { toBridgeUnitGroupNode } from './to-bridge-unit-group-node';
import { withBridgeUnitParent } from './with-bridge-unit-parent';

const isPairUnit = (node: ViewNode, unitIdA: string, unitIdB: string): boolean =>
  normalizeDiagramNodeTypeKey(node.data.type) === 'unit' &&
  (node.id === unitIdA || node.id === unitIdB);

const isOrphanComponent = (node: ViewNode): boolean =>
  isBridgeComponentLikeType(node.data.type) && node.parentId === undefined;

const mapNestableNode = (
  node: ViewNode,
  edges: readonly ViewEdge[],
  unitIdA: string,
  unitIdB: string,
): ViewNode => {
  if (!isBridgeNestableUnderUnit(node.data.type)) return node;
  const unitId = resolveBridgeNodeUnitId(node, edges, unitIdA, unitIdB);
  return unitId === undefined ? node : withBridgeUnitParent(node, unitId);
};

const projectBridgeNode = (
  node: ViewNode,
  edges: readonly ViewEdge[],
  unitIdA: string,
  unitIdB: string,
): ViewNode | undefined => {
  if (isOrphanComponent(node)) return undefined;
  if (isPairUnit(node, unitIdA, unitIdB)) return toBridgeUnitGroupNode(node);
  return mapNestableNode(node, edges, unitIdA, unitIdB);
};

const nodeIds = (nodes: readonly ViewNode[]): ReadonlySet<string> =>
  new Set(nodes.map((node) => node.id));

const edgesAmong = (edges: readonly ViewEdge[], ids: ReadonlySet<string>): ViewEdge[] =>
  edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));

export const groupBridgeNodesByUnit = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  unitIdA: string,
  unitIdB: string,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const projected = nodes
    .map((node) => projectBridgeNode(node, edges, unitIdA, unitIdB))
    .filter((node): node is ViewNode => node !== undefined);
  const nextNodes = orderBridgeNodesForReactFlow(projected);
  return { nodes: nextNodes, edges: edgesAmong(edges, nodeIds(nextNodes)) };
};
