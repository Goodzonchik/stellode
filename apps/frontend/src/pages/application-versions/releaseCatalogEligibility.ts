import { VersionStatus } from '@stellode/models';

export type CatalogVersionCandidate = {
  id: string;
  versionNumber: number;
  status: VersionStatus;
};

export type CompositionVersionRef = {
  componentVersionId: string;
  versionNumber: number;
};

export const eligibleVersionsForComponent = (
  catalogVersions: readonly CatalogVersionCandidate[],
  compositionRowsForComponent: readonly CompositionVersionRef[],
): CatalogVersionCandidate[] => {
  const selectedIds = new Set(
    compositionRowsForComponent.map((row) => row.componentVersionId),
  );
  const withoutUnactive = catalogVersions.filter(
    (version) =>
      version.status !== VersionStatus.Unactive && !selectedIds.has(version.id),
  );
  if (compositionRowsForComponent.length === 0) {
    return withoutUnactive.filter(
      (version) =>
        version.status === VersionStatus.Active ||
        version.status === VersionStatus.Deprecated ||
        version.status === VersionStatus.Draft,
    );
  }
  const maxInComposition = Math.max(
    ...compositionRowsForComponent.map((row) => row.versionNumber),
  );
  return withoutUnactive.filter((version) => version.versionNumber > maxInComposition);
};

export const defaultVersionId = (
  eligible: readonly CatalogVersionCandidate[],
): string => {
  if (eligible.length === 0) return '';
  const best = eligible.reduce((current, candidate) =>
    candidate.versionNumber > current.versionNumber ? candidate : current,
  );
  return best.id;
};

export type BumpVersionCandidate = CatalogVersionCandidate & { version: string };

export const eligibleBumpVersions = (
  current: CompositionVersionRef & { status: VersionStatus },
  newerVersions: readonly BumpVersionCandidate[],
  otherSelectedIds: ReadonlySet<string>,
): BumpVersionCandidate[] =>
  newerVersions.filter(
    (version) =>
      version.status !== VersionStatus.Unactive &&
      version.versionNumber > current.versionNumber &&
      !otherSelectedIds.has(version.id),
  );

export type TeamFilterOption = { value: string; label: string };

export const uniqueTeamFilterOptions = (
  teams: readonly ({ id: string; name: string } | null)[],
): TeamFilterOption[] => {
  const byId = new Map<string, string>();
  for (const team of teams) {
    if (!team) continue;
    byId.set(team.id, team.name);
  }
  return [...byId.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
};
