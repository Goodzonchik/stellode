import type { ViewEdge, ViewNode } from '@stellode/models';
import { BRIDGE_UNIT_STRUCTURAL_EDGE_TYPES } from './bridge-unit-structural-edge-types';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const isUnitInPair = (nodeId: string, pair: ReadonlySet<string>): boolean => pair.has(nodeId);

const unitIdFromData = (node: ViewNode, pair: ReadonlySet<string>): string | undefined => {
  const fromData = node.data.unitId;
  if (fromData !== undefined && isUnitInPair(fromData, pair)) return fromData;
  return undefined;
};

const otherEnd = (edge: ViewEdge, nodeId: string): string | undefined => {
  if (edge.source === nodeId) return edge.target;
  if (edge.target === nodeId) return edge.source;
  return undefined;
};

const unitIdFromStructuralEdge = (
  nodeId: string,
  edges: readonly ViewEdge[],
  pair: ReadonlySet<string>,
): string | undefined => {
  for (const edge of edges) {
    if (!BRIDGE_UNIT_STRUCTURAL_EDGE_TYPES.has(edge.relationshipType)) continue;
    const peer = otherEnd(edge, nodeId);
    if (peer !== undefined && isUnitInPair(peer, pair)) return peer;
  }
  return undefined;
};

export const resolveBridgeNodeUnitId = (
  node: ViewNode,
  edges: readonly ViewEdge[],
  unitIdA: string,
  unitIdB: string,
): string | undefined => {
  const pair = new Set([unitIdA, unitIdB]);
  if (normalizeDiagramNodeTypeKey(node.data.type) === 'unit' && isUnitInPair(node.id, pair)) {
    return node.id;
  }
  return unitIdFromData(node, pair) ?? unitIdFromStructuralEdge(node.id, edges, pair);
};
