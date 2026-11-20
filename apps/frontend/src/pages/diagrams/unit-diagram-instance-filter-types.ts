export const UnitDiagramFilterKind = {
  Team: 'team',
  Component: 'component',
  Service: 'service',
  Feature: 'feature',
  App: 'app',
} as const;

export type UnitDiagramFilterKind =
  (typeof UnitDiagramFilterKind)[keyof typeof UnitDiagramFilterKind];

export type UnitDiagramInstanceFilter = {
  readonly hiddenIds: Readonly<Record<UnitDiagramFilterKind, ReadonlySet<string>>>;
};

export type UnitDiagramFilterItem = {
  readonly id: string;
  readonly label: string;
};

export type UnitDiagramFilterCatalog = Readonly<
  Record<UnitDiagramFilterKind, readonly UnitDiagramFilterItem[]>
>;

export type UnitDiagramMasterCheckboxState = 'checked' | 'unchecked' | 'indeterminate';
