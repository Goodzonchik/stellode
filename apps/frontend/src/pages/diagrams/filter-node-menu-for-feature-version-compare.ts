import type { DiagramMenuItem } from './diagram-context-menu.config';

export const filterNodeMenuForFeatureVersionCompare = (
  items: readonly DiagramMenuItem[],
  compareEnabled: boolean,
): DiagramMenuItem[] => {
  if (!compareEnabled) return [...items];
  return items.filter(
    (item) =>
      item.action !== 'showImpact' &&
      item.action !== 'openInList' &&
      item.action !== 'fvAddDependsOn' &&
      item.action !== 'crossUnitDependsOn' &&
      item.action !== 'fvReplaceUses' &&
      item.action !== 'fvRemoveUses',
  );
};
