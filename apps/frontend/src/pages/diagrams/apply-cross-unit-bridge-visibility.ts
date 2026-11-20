import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

export type CrossUnitBridgeVisibilityOptions = {
  readonly teamsVisible: boolean;
  readonly codeOnly: boolean;
};

const isTeamType = (typeKey: string): boolean => typeKey === 'team';

const isServiceOrFeatureType = (typeKey: string): boolean =>
  typeKey === 'service' || typeKey === 'feature' || typeKey === 'featureVersion';

const isNodeVisible = (
  node: ViewNode,
  options: CrossUnitBridgeVisibilityOptions,
): boolean => {
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  if (!options.teamsVisible && isTeamType(typeKey)) return false;
  if (options.codeOnly && isServiceOrFeatureType(typeKey)) return false;
  return true;
};

export const applyCrossUnitBridgeVisibility = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  options: CrossUnitBridgeVisibilityOptions,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  if (options.teamsVisible && !options.codeOnly) {
    return { nodes: [...nodes], edges: [...edges] };
  }
  const visibleById = new Map(
    nodes.map((node) => [node.id, isNodeVisible(node, options)] as const),
  );
  const nextNodes = nodes.filter((node) => visibleById.get(node.id) === true);
  const ids = new Set(nextNodes.map((node) => node.id));
  const nextEdges = edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );
  return { nodes: nextNodes, edges: nextEdges };
};
