import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const ownerUnitId = (node: ViewNode): string | undefined => {
  if (normalizeDiagramNodeTypeKey(node.data.type) === 'unit') return node.id;
  return node.data.unitId;
};

const flipEdge = (edge: ViewEdge): ViewEdge => ({
  ...edge,
  source: edge.target,
  target: edge.source,
});

const shouldFlipForBridge = (
  sourceUnit: string | undefined,
  targetUnit: string | undefined,
  unitIdB: string,
  unitIdA: string,
): boolean => {
  if (sourceUnit === undefined || targetUnit === undefined) return false;
  if (sourceUnit === unitIdB && targetUnit === unitIdB) return true;
  return sourceUnit === unitIdB && targetUnit === unitIdA;
};

export const orientCrossUnitBridgeForLayout = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  unitIdA: string,
  unitIdB: string,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const unitByNodeId = new Map(nodes.map((node) => [node.id, ownerUnitId(node)] as const));
  const orientedEdges = edges.map((edge) => {
    const sourceUnit = unitByNodeId.get(edge.source);
    const targetUnit = unitByNodeId.get(edge.target);
    return shouldFlipForBridge(sourceUnit, targetUnit, unitIdB, unitIdA)
      ? flipEdge(edge)
      : edge;
  });
  return { nodes: [...nodes], edges: orientedEdges };
};
