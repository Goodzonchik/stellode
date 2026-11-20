import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { ViewEdge, ViewNode } from '@stellode/models';
import { elkLayoutOptions } from './elk-layout-options';
import type { LayoutDirection } from './layout-direction';
import { estimateViewNodeDimensions } from './estimate-view-node-dimensions';

type ChildrenByParent = ReadonlyMap<string | undefined, readonly ViewNode[]>;

const groupChildrenByParent = (nodes: readonly ViewNode[]): ChildrenByParent => {
  const result = new Map<string | undefined, ViewNode[]>();
  for (const node of nodes) {
    const siblings = result.get(node.parentId) ?? [];
    result.set(node.parentId, [...siblings, node]);
  }
  return result;
};

const toLeafElkNode = (node: ViewNode): ElkNode => ({ id: node.id, ...estimateViewNodeDimensions(node) });

const toContainerElkNode = (node: ViewNode, children: ElkNode[]): ElkNode => ({
  id: node.id,
  layoutOptions: elkLayoutOptions.container(),
  children,
});

const toElkNode = (node: ViewNode, childrenByParent: ChildrenByParent): ElkNode => {
  const children = childrenByParent.get(node.id) ?? [];
  if (children.length === 0) return toLeafElkNode(node);
  return toContainerElkNode(node, children.map((child) => toElkNode(child, childrenByParent)));
};

const toElkEdge = (edge: ViewEdge): ElkExtendedEdge => ({
  id: edge.id,
  sources: [edge.source],
  targets: [edge.target],
});

const knownEndpoints = (edge: ViewEdge, ids: ReadonlySet<string>): boolean =>
  ids.has(edge.source) && ids.has(edge.target);

export const buildElkGraph = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  direction: LayoutDirection,
): ElkNode => {
  const childrenByParent = groupChildrenByParent(nodes);
  const ids = new Set(nodes.map((node) => node.id));
  return {
    id: 'root',
    layoutOptions: elkLayoutOptions.root(direction),
    children: (childrenByParent.get(undefined) ?? []).map((node) => toElkNode(node, childrenByParent)),
    edges: edges.filter((edge) => knownEndpoints(edge, ids)).map(toElkEdge),
  };
};
