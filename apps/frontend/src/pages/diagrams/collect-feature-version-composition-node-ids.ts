import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

const isComponentEndpoint = (node: ViewNode): boolean => {
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  return isComponentLikeType(typeKey) || typeKey === 'componentVersion';
};

const addCompositionId = (ids: Set<string>, node: ViewNode): void => {
  ids.add(node.id);
  const sourceId = node.data.sourceId;
  if (typeof sourceId === 'string' && sourceId.length > 0) ids.add(sourceId);
};

const componentEndOfUses = (
  edge: ViewEdge,
  byId: ReadonlyMap<string, ViewNode>,
): ViewNode | undefined => {
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  if (source !== undefined && isComponentEndpoint(source)) return source;
  if (target !== undefined && isComponentEndpoint(target)) return target;
  return undefined;
};

const usesTouchesFeatureVersion = (
  edge: ViewEdge,
  featureVersionIds: ReadonlySet<string>,
): boolean =>
  featureVersionIds.has(edge.source) || featureVersionIds.has(edge.target);

export const collectFeatureVersionCompositionNodeIds = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  featureVersionIds: readonly string[] = [],
): ReadonlySet<string> => {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const scopedFvIds = new Set(featureVersionIds.filter((id) => id.length > 0));
  const ids = new Set<string>();
  for (const edge of edges) {
    if (
      edge.relationshipType !== 'USES_COMPONENT_VERSION' &&
      edge.relationshipType !== 'USES'
    ) {
      continue;
    }
    if (scopedFvIds.size > 0 && !usesTouchesFeatureVersion(edge, scopedFvIds)) continue;
    const component = componentEndOfUses(edge, byId);
    if (component === undefined) continue;
    addCompositionId(ids, component);
  }
  for (const node of nodes) {
    if (!isComponentEndpoint(node)) continue;
    const sourceId = node.data.sourceId;
    if (typeof sourceId === 'string' && ids.has(sourceId)) {
      ids.add(node.id);
    }
  }
  return ids;
};

export const isFeatureVersionCompositionNode = (
  node: ViewNode,
  compositionIds: ReadonlySet<string>,
): boolean => {
  if (compositionIds.has(node.id)) return true;
  const sourceId = node.data.sourceId;
  return typeof sourceId === 'string' && compositionIds.has(sourceId);
};
