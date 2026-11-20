import type { ViewNode } from '@stellode/models';

export const toBridgeUnitGroupNode = (node: ViewNode): ViewNode => ({
  ...node,
  type: 'group',
  parentId: undefined,
  extent: undefined,
  data: { ...node.data, unitId: node.id },
});
