import type { FeatureVersionCompareSets } from './feature-version-compare-sets';

export type FeatureVersionCompareDiff = {
  readonly added: FeatureVersionCompareSets;
  readonly removed: FeatureVersionCompareSets;
};

const setDiff = (
  current: ReadonlySet<string>,
  previous: ReadonlySet<string>,
): { added: Set<string>; removed: Set<string> } => {
  const added = new Set<string>();
  const removed = new Set<string>();
  for (const key of current) {
    if (!previous.has(key)) added.add(key);
  }
  for (const key of previous) {
    if (!current.has(key)) removed.add(key);
  }
  return { added, removed };
};

export const diffFeatureVersionCompareSets = (
  current: FeatureVersionCompareSets,
  previous: FeatureVersionCompareSets,
): FeatureVersionCompareDiff => {
  const composition = setDiff(current.composition, previous.composition);
  const dependsOn = setDiff(current.dependsOn, previous.dependsOn);
  const applications = setDiff(current.applications, previous.applications);
  const units = setDiff(current.units, previous.units);
  return {
    added: {
      composition: composition.added,
      dependsOn: dependsOn.added,
      applications: applications.added,
      units: units.added,
    },
    removed: {
      composition: composition.removed,
      dependsOn: dependsOn.removed,
      applications: applications.removed,
      units: units.removed,
    },
  };
};
