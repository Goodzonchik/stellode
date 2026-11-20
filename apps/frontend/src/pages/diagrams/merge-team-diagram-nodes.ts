import type { ViewEdge, ViewNode } from '@stellode/models';
import { mergeVersionNodes, overviewVersionMergeConfig } from './merge-version-nodes';

export const mergeTeamDiagramNodes = (
  nodes: ViewNode[],
  edges: ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  return mergeVersionNodes(nodes, edges, overviewVersionMergeConfig);
};
