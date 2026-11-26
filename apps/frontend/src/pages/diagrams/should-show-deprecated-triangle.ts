import { VersionStatus, type ViewNode } from '@stellode/models';

export type StatusWarningTriangleKind =
  | typeof VersionStatus.Deprecated
  | typeof VersionStatus.Unactive;

const hasVersionMarker = (data: ViewNode['data']): boolean =>
  data.actualVersion !== undefined || data.actualVersionNumber !== undefined;

export const statusWarningTriangleKind = (
  data: ViewNode['data'],
): StatusWarningTriangleKind | null => {
  if (data.diffStatus === 'added' || data.diffStatus === 'removed') return null;
  if (!hasVersionMarker(data)) return null;
  if (data.applicationStatus === VersionStatus.Deprecated) return VersionStatus.Deprecated;
  if (data.status === VersionStatus.Unactive) return VersionStatus.Unactive;
  return null;
};

export const shouldShowDeprecatedTriangle = (data: ViewNode['data']): boolean =>
  statusWarningTriangleKind(data) !== null;
