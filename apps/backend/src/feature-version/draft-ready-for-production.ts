import type { FeatureBindingReadiness } from '@stellode/models';

export const draftReadyForProduction = (
  bindings: readonly FeatureBindingReadiness[],
  crossUnitBindings: readonly FeatureBindingReadiness[],
): boolean =>
  bindings.length > 0 &&
  bindings.every((binding) => binding.ready) &&
  crossUnitBindings.every((binding) => binding.ready);
