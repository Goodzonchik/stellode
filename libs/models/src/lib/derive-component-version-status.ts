import { VersionStatus, type VersionStatus as VersionStatusType } from './version-status';

export type ApplicationComponentStatus =
  | typeof VersionStatus.Active
  | typeof VersionStatus.Deprecated;

export const isApplicationComponentStatus = (
  value: string,
): value is ApplicationComponentStatus =>
  value === VersionStatus.Active || value === VersionStatus.Deprecated;

export const deriveComponentVersionStatus = (
  current: VersionStatusType,
  applicationStatuses: readonly ApplicationComponentStatus[],
): VersionStatusType => {
  if (current === VersionStatus.Draft) return VersionStatus.Draft;
  if (applicationStatuses.some((status) => status === VersionStatus.Active)) {
    return VersionStatus.Active;
  }
  if (applicationStatuses.some((status) => status === VersionStatus.Deprecated)) {
    return VersionStatus.Deprecated;
  }
  return VersionStatus.Unactive;
};
