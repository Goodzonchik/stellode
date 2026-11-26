import { VersionStatus } from '@stellode/models';

const mutedVisualStatuses = new Set<string>([
  VersionStatus.Deprecated,
  VersionStatus.Unactive,
]);

const statusClassPart = (prefix: string, status: string | undefined): string => {
  if (status === undefined || mutedVisualStatuses.has(status)) return '';
  return `custom-node--${prefix}-${status.replace(/\s+/g, '-')}`;
};

export const customNodeStatusClass = (
  status: string | undefined,
  applicationStatus: string | undefined,
): string =>
  [statusClassPart('status', status), statusClassPart('app-status', applicationStatus)]
    .filter((part) => part !== '')
    .join(' ');
