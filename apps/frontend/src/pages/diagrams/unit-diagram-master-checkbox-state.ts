import type { UnitDiagramMasterCheckboxState } from './unit-diagram-instance-filter-types';

export const unitDiagramMasterCheckboxState = (
  itemIds: readonly string[],
  hiddenIds: ReadonlySet<string>,
): UnitDiagramMasterCheckboxState => {
  if (itemIds.length === 0) return 'checked';
  const hiddenCount = itemIds.filter((id) => hiddenIds.has(id)).length;
  if (hiddenCount === 0) return 'checked';
  if (hiddenCount === itemIds.length) return 'unchecked';
  return 'indeterminate';
};
