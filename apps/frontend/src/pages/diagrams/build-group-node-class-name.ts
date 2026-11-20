import type { ViewNode } from '@stellode/models';
import { isGroupNodeUnitType } from './is-group-node-unit-type';

export const buildGroupNodeClassName = (data: ViewNode['data']): string => {
  const isUnit = isGroupNodeUnitType(data.type);
  return [
    'group-node',
    isUnit ? 'group-node--unit' : '',
    data.containsDependency === true ? 'group-node--with-dependency' : '',
    data.impactHighlighted ? 'group-node--impact' : '',
    data.hoverHighlighted ? 'group-node--hover' : '',
    data.diffStatus === 'added' ? 'group-node--diff-added' : '',
    data.diffStatus === 'removed' ? 'group-node--diff-removed' : '',
  ]
    .filter(Boolean)
    .join(' ');
};
