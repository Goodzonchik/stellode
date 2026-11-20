import type { DiagramMenuItem } from './diagram-context-menu.config';

const hiddenInTable = new Set<DiagramMenuItem['action']>(['showImpact']);

const foreignOnlyActions = new Set<DiagramMenuItem['action']>(['openInList']);

export const featureVersionTableRowActions = (
  items: readonly DiagramMenuItem[],
  composition = true,
): DiagramMenuItem[] =>
  items.filter((item) => {
    if (hiddenInTable.has(item.action)) return false;
    if (composition) return true;
    return foreignOnlyActions.has(item.action);
  });
