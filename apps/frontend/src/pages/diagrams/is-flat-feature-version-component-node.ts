import type { ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

export const isFlatFeatureVersionComponentNode = (node: ViewNode): boolean => {
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  if (!isComponentLikeType(typeKey) && typeKey !== 'componentVersion') return false;
  return node.parentId === undefined || node.parentId === '';
};
