import { VersionStatus } from '@stellode/models';
import type { FeatureVersionLegendRow } from './feature-version-legend-row';

const versionNumberOf = (row: FeatureVersionLegendRow): number =>
  typeof row.versionNumber === 'number' && Number.isFinite(row.versionNumber)
    ? row.versionNumber
    : Number.NEGATIVE_INFINITY;

export const resolveDefaultFeatureVersionId = (
  rows: readonly FeatureVersionLegendRow[],
): string | null => {
  const active = rows.find((row) => row.status === VersionStatus.Active);
  if (active) return active.id;
  if (rows.length === 0) return null;
  return rows.reduce((best, row) =>
    versionNumberOf(row) > versionNumberOf(best) ? row : best,
  ).id;
};
