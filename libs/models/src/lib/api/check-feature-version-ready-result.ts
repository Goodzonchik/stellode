import type { FeatureBindingReadiness } from './feature-binding-readiness';
import type { FeatureVersionReadinessReason } from './feature-version-readiness-reason';
import type { VersionStatus } from '../version-status';

export type FeatureVersionCheckSnapshot = {
  readonly id: string;
  readonly status: VersionStatus;
  readonly readyToProduction: boolean;
};

export type CheckFeatureVersionReadyResult = {
  readonly featureVersion: FeatureVersionCheckSnapshot;
  readonly readyToProduction: boolean;
  readonly reason: FeatureVersionReadinessReason | null;
  readonly bindings: readonly FeatureBindingReadiness[];
  readonly crossUnitBindings: readonly FeatureBindingReadiness[];
};
