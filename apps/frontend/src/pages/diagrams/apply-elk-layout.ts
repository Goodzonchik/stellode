import type { ElkNode } from 'elkjs/lib/elk-api';
import { Position } from '@xyflow/react';
import type { ViewNode } from '@stellode/models';
import type { LayoutDirection } from './layout-direction';
import type { LayoutedViewNode } from './layouted-view-node';

type ElkNodeById = ReadonlyMap<string, ElkNode>;

const indexElkNodes = (root: ElkNode): ElkNodeById => {
  const result = new Map<string, ElkNode>();
  const visit = (node: ElkNode): void => {
    result.set(node.id, node);
    (node.children ?? []).forEach(visit);
  };
  (root.children ?? []).forEach(visit);
  return result;
};

const handlePositions = (direction: LayoutDirection): Pick<LayoutedViewNode, 'sourcePosition' | 'targetPosition'> =>
  direction === 'LR'
    ? { sourcePosition: Position.Right, targetPosition: Position.Left }
    : { sourcePosition: Position.Bottom, targetPosition: Position.Top };

const containerStyle = (elkNode: ElkNode): Pick<ViewNode, 'style'> =>
  (elkNode.children ?? []).length > 0 ? { style: { width: elkNode.width, height: elkNode.height } } : {};

const positionedNode = (node: ViewNode, elkNode: ElkNode | undefined, direction: LayoutDirection): LayoutedViewNode => ({
  ...node,
  ...handlePositions(direction),
  ...(elkNode === undefined ? {} : containerStyle(elkNode)),
  position: elkNode === undefined ? node.position : { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
});

export const applyElkLayout = (
  nodes: readonly ViewNode[],
  layouted: ElkNode,
  direction: LayoutDirection,
): LayoutedViewNode[] => {
  const byId = indexElkNodes(layouted);
  return nodes.map((node) => positionedNode(node, byId.get(node.id), direction));
};
