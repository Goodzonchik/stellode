import { VersionStatus, type VersionStatus as VersionStatusType } from '@stellode/models';

export const filterFeatureVersionTransitionTargets = (
  sourceStatus: VersionStatusType,
  targets: readonly VersionStatusType[],
): VersionStatusType[] =>
  targets.filter(
    (target) =>
      target !== VersionStatus.Draft &&
      !(sourceStatus === VersionStatus.Unactive && target === VersionStatus.Active),
  );
