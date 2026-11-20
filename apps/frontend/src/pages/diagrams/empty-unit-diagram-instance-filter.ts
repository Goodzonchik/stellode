import type { UnitDiagramInstanceFilter } from './unit-diagram-instance-filter-types';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';

export const emptyUnitDiagramInstanceFilter = (): UnitDiagramInstanceFilter => ({
  hiddenIds: {
    [UnitDiagramFilterKind.Team]: new Set(),
    [UnitDiagramFilterKind.Component]: new Set(),
    [UnitDiagramFilterKind.Service]: new Set(),
    [UnitDiagramFilterKind.Feature]: new Set(),
    [UnitDiagramFilterKind.App]: new Set(),
  },
});
