import type { FeatureBindingReadiness } from '@stellode/models';

export const filterNotReadyBindings = (
  bindings: readonly FeatureBindingReadiness[],
): readonly FeatureBindingReadiness[] => bindings.filter((binding) => !binding.ready);
