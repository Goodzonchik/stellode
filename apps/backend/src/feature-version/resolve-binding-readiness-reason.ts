import {
  FeatureBindingReadinessReason,
  parseVersionStatus,
  VersionStatus,
  type FeatureBindingReadinessReason as FeatureBindingReadinessReasonType,
  type VersionStatus as VersionStatusType,
} from '@stellode/models';

export type BindingReadinessRowInput = {
  readonly hasCurrentRelease: boolean;
  readonly statusInRelease: unknown;
};

const isProductionReleaseStatus = (status: VersionStatusType): boolean =>
  status === VersionStatus.Active || status === VersionStatus.Deprecated;

export const resolveBindingReadinessReason = (
  row: BindingReadinessRowInput,
): FeatureBindingReadinessReasonType => {
  if (!row.hasCurrentRelease) {
    return FeatureBindingReadinessReason.ApplicationHasNoCurrentRelease;
  }
  const status = parseVersionStatus(row.statusInRelease);
  if (status === null) {
    return FeatureBindingReadinessReason.ComponentNotInCurrentRelease;
  }
  if (!isProductionReleaseStatus(status)) {
    return FeatureBindingReadinessReason.ComponentNotActiveInRelease;
  }
  return FeatureBindingReadinessReason.Ready;
};
