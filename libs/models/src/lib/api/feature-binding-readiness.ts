import type { VersionStatus } from '../version-status';
import type { FeatureBindingReadinessReason } from './feature-binding-readiness-reason';

export type FeatureBindingReadiness = {
  readonly applicationId: string;
  readonly applicationName: string;
  readonly componentId: string;
  readonly componentName: string;
  readonly componentVersionId: string;
  readonly componentVersion: string;
  readonly unitId: string;
  readonly statusInRelease: VersionStatus | null;
  readonly ready: boolean;
  readonly reason: FeatureBindingReadinessReason;
};
