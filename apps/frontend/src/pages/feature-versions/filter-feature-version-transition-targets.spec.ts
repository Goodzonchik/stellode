import { VersionStatus } from '@stellode/models';
import { filterFeatureVersionTransitionTargets } from './filter-feature-version-transition-targets';

describe('filterFeatureVersionTransitionTargets', () => {
  it('removes draft target but keeps unactive for active source', () => {
    const targets = [
      VersionStatus.Active,
      VersionStatus.Draft,
      VersionStatus.Unactive,
      VersionStatus.Deprecated,
    ];

    const filtered = filterFeatureVersionTransitionTargets(VersionStatus.Active, targets);

    expect(filtered).toEqual([
      VersionStatus.Active,
      VersionStatus.Unactive,
      VersionStatus.Deprecated,
    ]);
  });

  it('keeps targets unchanged when there are no auto transitions', () => {
    const targets = [VersionStatus.Active, VersionStatus.Deprecated];

    const filtered = filterFeatureVersionTransitionTargets(VersionStatus.Draft, targets);

    expect(filtered).toEqual(targets);
  });

  it('removes manual unactive to active transition', () => {
    const targets = [VersionStatus.Active];

    const filtered = filterFeatureVersionTransitionTargets(VersionStatus.Unactive, targets);

    expect(filtered).toEqual([]);
  });
});
