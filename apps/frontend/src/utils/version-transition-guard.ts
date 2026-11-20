import { VersionStatus, type VersionStatus as VS } from '@stellode/models';

const criticalTransitions = new Set<string>([
  `${VersionStatus.Active}->${VersionStatus.Draft}`,
  `${VersionStatus.Active}->${VersionStatus.Unactive}`,
  `${VersionStatus.Unactive}->${VersionStatus.Active}`,
]);

export const featureVersionNeedsCriticalConfirm = (from: VS, to: VS): boolean => {
  return criticalTransitions.has(`${from}->${to}`);
};
