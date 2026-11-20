import type { ApplicationVersionCompositionItem } from '@stellode/models';

export const filterApplicationCompositionItems = (
  items: readonly ApplicationVersionCompositionItem[],
  nameFilter: string,
  teamFilter: string,
): ApplicationVersionCompositionItem[] => {
  const nameQuery = nameFilter.trim().toLowerCase();
  return items.filter((item) => {
    if (nameQuery && !item.componentName.toLowerCase().includes(nameQuery)) return false;
    if (teamFilter && item.teamId !== teamFilter) return false;
    return true;
  });
};
