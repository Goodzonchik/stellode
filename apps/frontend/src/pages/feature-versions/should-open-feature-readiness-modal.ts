import type { CheckFeatureVersionReadyResult } from '@stellode/models';
import { countNotReadyBindings } from './count-not-ready-bindings';

export const shouldOpenFeatureReadinessModal = (
  result: CheckFeatureVersionReadyResult,
): boolean =>
  countNotReadyBindings(result.bindings) + countNotReadyBindings(result.crossUnitBindings) > 0;
