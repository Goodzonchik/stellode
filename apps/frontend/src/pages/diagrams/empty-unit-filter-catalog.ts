import {
  UnitDiagramFilterKind,
  type UnitDiagramFilterCatalog,
} from './unit-diagram-instance-filter-types';

export const emptyUnitFilterCatalog = (): UnitDiagramFilterCatalog => ({
  [UnitDiagramFilterKind.Team]: [],
  [UnitDiagramFilterKind.Component]: [],
  [UnitDiagramFilterKind.Service]: [],
  [UnitDiagramFilterKind.Feature]: [],
  [UnitDiagramFilterKind.App]: [],
});
