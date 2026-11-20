import type { DiagramMenuItem } from './diagram-context-menu.config';

export const filterPaneMenuItemsForFeatureVersionReadOnly = (
  items: readonly DiagramMenuItem[],
  readOnly: boolean,
): DiagramMenuItem[] => {
  if (!readOnly) {
    return [...items];
  }
  return items.filter(
    (item) => item.action !== 'createComponent' && item.action !== 'addComponent',
  );
};
