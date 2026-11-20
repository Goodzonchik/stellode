import { diffFeatureVersionCompareSets } from './diff-feature-version-compare-sets';
import type { FeatureVersionCompareSets } from './feature-version-compare-sets';

const empty = (): FeatureVersionCompareSets => ({
  composition: new Set(),
  dependsOn: new Set(),
  applications: new Set(),
  units: new Set(),
});

describe('diffFeatureVersionCompareSets', () => {
  it('marks keys only in current as added and only in previous as removed', () => {
    const current: FeatureVersionCompareSets = {
      composition: new Set(['cv1::app1', 'cv2::app1']),
      dependsOn: new Set(['cv1::cv2']),
      applications: new Set(['app1', 'app2']),
      units: new Set(['u1']),
    };
    const previous: FeatureVersionCompareSets = {
      composition: new Set(['cv1::app1', 'cv0::app1']),
      dependsOn: new Set(['cv0::cv1']),
      applications: new Set(['app1']),
      units: new Set(['u1', 'u0']),
    };
    const diff = diffFeatureVersionCompareSets(current, previous);
    expect([...diff.added.composition]).toEqual(['cv2::app1']);
    expect([...diff.removed.composition]).toEqual(['cv0::app1']);
    expect([...diff.added.dependsOn]).toEqual(['cv1::cv2']);
    expect([...diff.removed.dependsOn]).toEqual(['cv0::cv1']);
    expect([...diff.added.applications]).toEqual(['app2']);
    expect([...diff.removed.applications]).toEqual([]);
    expect([...diff.added.units]).toEqual([]);
    expect([...diff.removed.units]).toEqual(['u0']);
  });

  it('returns empty diffs for identical sets', () => {
    const sets = empty();
    const diff = diffFeatureVersionCompareSets(sets, sets);
    expect(diff.added.composition.size).toBe(0);
    expect(diff.removed.composition.size).toBe(0);
  });
});
