import type {
  UnitDiagramFilterKind,
  UnitDiagramInstanceFilter,
} from './unit-diagram-instance-filter-types';

export const toggleUnitDiagramHiddenId = (
  filter: UnitDiagramInstanceFilter,
  kind: UnitDiagramFilterKind,
  id: string,
): UnitDiagramInstanceFilter => {
  const previous = filter.hiddenIds[kind];
  const next = new Set(previous);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return {
    hiddenIds: {
      ...filter.hiddenIds,
      [kind]: next,
    },
  };
};
