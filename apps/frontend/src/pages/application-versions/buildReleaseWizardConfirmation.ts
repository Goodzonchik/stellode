type ReleaseWizardConfirmationRow = {
  component: { id: string; name: string };
  team: { id: string; name: string } | null;
  componentVersion: {
    id: string;
    version: string;
    status: string;
    applicationStatus?: string;
  };
};

type ReleaseWizardConfirmation = {
  excludedFromRelease: ReleaseWizardConfirmationRow[];
  newInRelease: ReleaseWizardConfirmationRow[];
  versionChanges: Array<{
    componentId: string;
    componentName: string;
    before: Array<{ id: string; version: string; status: string }>;
    after: Array<{ id: string; version: string; status: string }>;
  }>;
  unchanged: ReleaseWizardConfirmationRow[];
};

const multisetEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
};

const componentIds = (rows: ReleaseWizardConfirmationRow[]): Set<string> =>
  new Set(rows.map((row) => row.component.id));

const versionIdsForComponent = (
  rows: ReleaseWizardConfirmationRow[],
  componentId: string,
): string[] => rows.filter((row) => row.component.id === componentId).map((row) => row.componentVersion.id);

const toMinRow = (row: ReleaseWizardConfirmationRow): ReleaseWizardConfirmationRow => ({
  component: { id: row.component.id, name: row.component.name },
  team: row.team ? { id: row.team.id, name: row.team.name } : null,
  componentVersion: {
    id: row.componentVersion.id,
    version: row.componentVersion.version,
    status: row.componentVersion.status,
    applicationStatus: row.componentVersion.applicationStatus,
  },
});

const toVersionPatch = (row: ReleaseWizardConfirmationRow) => ({
  id: row.componentVersion.id,
  version: row.componentVersion.version,
  status: row.componentVersion.status,
});

export function buildReleaseWizardConfirmation(
  initial: ReleaseWizardConfirmationRow[],
  finalRows: ReleaseWizardConfirmationRow[],
): ReleaseWizardConfirmation {
  const initialCvIds = new Set(initial.map((row) => row.componentVersion.id));
  const finalCvIds = new Set(finalRows.map((row) => row.componentVersion.id));
  const initialComp = componentIds(initial);
  const finalComp = componentIds(finalRows);

  const versionChangeComponentIds = new Set<string>();
  for (const componentId of initialComp) {
    if (!finalComp.has(componentId)) continue;
    const initIds = versionIdsForComponent(initial, componentId);
    const finIds = versionIdsForComponent(finalRows, componentId);
    if (!multisetEqual(initIds, finIds)) versionChangeComponentIds.add(componentId);
  }

  const excludedFromRelease = initial
    .filter(
      (row) =>
        !finalCvIds.has(row.componentVersion.id) && !versionChangeComponentIds.has(row.component.id),
    )
    .map(toMinRow);

  const newInRelease = finalRows
    .filter(
      (row) =>
        !initialCvIds.has(row.componentVersion.id) &&
        !versionChangeComponentIds.has(row.component.id),
    )
    .map(toMinRow);

  const unchanged = finalRows
    .filter((row) => initialCvIds.has(row.componentVersion.id))
    .map(toMinRow);

  const versionChanges = [...versionChangeComponentIds]
    .map((componentId) => {
      const beforeRows = initial.filter((row) => row.component.id === componentId);
      const afterRows = finalRows.filter((row) => row.component.id === componentId);
      const componentName = afterRows[0]?.component.name ?? beforeRows[0]?.component.name ?? '';
      return {
        componentId,
        componentName,
        before: beforeRows.map(toVersionPatch),
        after: afterRows.map(toVersionPatch),
      };
    })
    .sort((left, right) => left.componentName.localeCompare(right.componentName));

  return { excludedFromRelease, newInRelease, versionChanges, unchanged };
}
