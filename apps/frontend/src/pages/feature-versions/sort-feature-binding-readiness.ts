import type { FeatureBindingReadiness } from '@stellode/models';

export const sortFeatureBindingReadiness = (
  bindings: readonly FeatureBindingReadiness[],
): readonly FeatureBindingReadiness[] =>
  [...bindings].sort((left, right) => {
    if (left.ready !== right.ready) return left.ready ? 1 : -1;
    const appCompare = left.applicationName.localeCompare(right.applicationName);
    if (appCompare !== 0) return appCompare;
    return left.componentName.localeCompare(right.componentName);
  });
