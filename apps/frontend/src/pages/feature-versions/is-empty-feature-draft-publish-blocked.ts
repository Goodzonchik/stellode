import { VersionStatus } from '@stellode/models';

export const isEmptyFeatureDraftPublishBlocked = (
  status: string,
  componentVersions: readonly unknown[] | undefined,
): boolean => status === VersionStatus.Draft && (componentVersions?.length ?? 0) === 0;
