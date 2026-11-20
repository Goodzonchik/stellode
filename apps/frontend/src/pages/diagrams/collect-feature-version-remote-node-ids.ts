import type { ViewEdge, ViewNode } from '@stellode/models';
import {
  collectFeatureVersionCompositionNodeIds,
  isFeatureVersionCompositionNode,
} from './collect-feature-version-composition-node-ids';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

const nodeUnitId = (node: ViewNode): string | undefined => {
  const unitId = node.data.unitId;
  return typeof unitId === 'string' && unitId.length > 0 ? unitId : undefined;
};

const isComponentEndpoint = (node: ViewNode): boolean => {
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  return isComponentLikeType(typeKey) || typeKey === 'componentVersion';
};

export const collectFeatureVersionRemoteNodeIds = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  featureVersionIds: readonly string[] = [],
): ReadonlySet<string> => {
  const compositionIds = collectFeatureVersionCompositionNodeIds(
    nodes,
    edges,
    featureVersionIds,
  );
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const remoteIds = new Set<string>();

  for (const edge of edges) {
    if (!isCrossUnitDependsOnEdge(edge, byId, compositionIds)) continue;
    for (const endId of [edge.source, edge.target]) {
      const end = byId.get(endId);
      if (end === undefined || !isComponentEndpoint(end)) continue;
      if (isFeatureVersionCompositionNode(end, compositionIds)) continue;
      remoteIds.add(end.id);
      if (typeof end.parentId === 'string' && end.parentId.length > 0) {
        remoteIds.add(end.parentId);
      }
    }
  }

  for (const edge of edges) {
    if (edge.relationshipType !== 'MAINTAINS') continue;
    if (!remoteIds.has(edge.target)) continue;
    remoteIds.add(edge.source);
  }
  return remoteIds;
};

export const isCrossUnitDependsOnEdge = (
  edge: ViewEdge,
  byId: ReadonlyMap<string, ViewNode>,
  compositionIds?: ReadonlySet<string>,
): boolean => {
  if (edge.relationshipType !== 'DEPENDS_ON') return false;
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  if (source === undefined || target === undefined) return false;
  if (!isComponentEndpoint(source) || !isComponentEndpoint(target)) return false;
  const sourceUnitId = nodeUnitId(source);
  const targetUnitId = nodeUnitId(target);
  if (sourceUnitId !== undefined && targetUnitId !== undefined) {
    return sourceUnitId !== targetUnitId;
  }
  if (compositionIds === undefined) return false;
  const sourceLocal = isFeatureVersionCompositionNode(source, compositionIds);
  const targetLocal = isFeatureVersionCompositionNode(target, compositionIds);
  return sourceLocal !== targetLocal;
};
