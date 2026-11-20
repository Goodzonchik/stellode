import { resolveDefaultFeatureVersionId } from './resolve-default-feature-version-id';
import type { FeatureVersionLegendRow } from './feature-version-legend-row';

const row = (
  id: string,
  status: string,
  versionNumber: number,
): FeatureVersionLegendRow => ({
  id,
  version: String(versionNumber),
  versionNumber,
  status,
});

describe('resolveDefaultFeatureVersionId', () => {
  it('returns active when present even if draft has higher versionNumber', () => {
    expect(
      resolveDefaultFeatureVersionId([
        row('draft', 'draft', 3),
        row('active', 'active', 1),
        row('dep', 'deprecated', 2),
      ]),
    ).toBe('active');
  });

  it('returns max versionNumber when there is no active', () => {
    expect(
      resolveDefaultFeatureVersionId([
        row('draft', 'draft', 2),
        row('dep', 'deprecated', 5),
      ]),
    ).toBe('dep');
  });

  it('returns null for empty list', () => {
    expect(resolveDefaultFeatureVersionId([])).toBeNull();
  });
});
