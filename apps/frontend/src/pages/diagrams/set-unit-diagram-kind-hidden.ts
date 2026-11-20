import type {
  UnitDiagramFilterKind,
  UnitDiagramInstanceFilter,
} from './unit-diagram-instance-filter-types';

export const setUnitDiagramKindHidden = (
  filter: UnitDiagramInstanceFilter,
  kind: UnitDiagramFilterKind,
  itemIds: readonly string[],
  hideAll: boolean,
): UnitDiagramInstanceFilter => ({
  hiddenIds: {
    ...filter.hiddenIds,
    [kind]: hideAll ? new Set(itemIds) : new Set(),
  },
});
