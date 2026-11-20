import type { FeatureBindingReadiness } from '@stellode/models';

export const countNotReadyBindings = (
  bindings: readonly FeatureBindingReadiness[],
): number => bindings.filter((binding) => !binding.ready).length;
