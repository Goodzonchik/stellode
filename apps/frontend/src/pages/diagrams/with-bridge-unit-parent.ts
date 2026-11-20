import type { ViewNode } from '@stellode/models';

export const withBridgeUnitParent = (node: ViewNode, unitId: string): ViewNode => ({
  ...node,
  parentId: unitId,
  extent: 'parent',
  data: { ...node.data, unitId },
});
