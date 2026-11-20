import type { ViewEdge, ViewNode } from '@stellode/models';
import { buildGroupedEdges } from './build-grouped-edges';
import { buildGroupedNodes } from './build-grouped-nodes';
import { collectApplicationGrouping } from './collect-application-grouping';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const hasApplicationVersionNode = (nodes: readonly ViewNode[]): boolean =>
  nodes.some((node) => normalizeDiagramNodeTypeKey(node.data.type) === 'applicationVersion');

export const groupNodesByApplication = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const grouping = collectApplicationGrouping(nodes, edges);
  if (
    grouping.membershipsByChild.size === 0 &&
    grouping.collapsedVersionToApplication.size === 0 &&
    !hasApplicationVersionNode(nodes)
  ) {
    return { nodes: [...nodes], edges: [...edges] };
  }
  return {
    nodes: buildGroupedNodes(nodes, grouping),
    edges: buildGroupedEdges(edges, grouping),
  };
};
