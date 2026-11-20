const RAISE_CANDIDATE_STATUSES = new Set(['draft', 'active', 'deprecated']);

export type RaiseComponentVersionCandidate = {
  readonly id: string;
  readonly version: string;
  readonly versionNumber: number;
  readonly status: string;
};

export const filterRaiseComponentVersionCandidates = (
  rows: readonly RaiseComponentVersionCandidate[],
  fromVersionNumber: number,
): RaiseComponentVersionCandidate[] =>
  rows
    .filter(
      (row) =>
        row.versionNumber > fromVersionNumber && RAISE_CANDIDATE_STATUSES.has(row.status),
    )
    .slice()
    .sort((left, right) => right.versionNumber - left.versionNumber);
