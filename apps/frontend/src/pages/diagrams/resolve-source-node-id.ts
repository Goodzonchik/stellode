import type { ViewNode } from '@stellode/models';

export const resolveSourceNodeId = (node: Pick<ViewNode, 'id' | 'data'>): string =>
  node.data.sourceId ?? node.id;
