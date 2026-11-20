import {
  ApplicationVersionStatus,
  type ApplicationVersionStatus as ApplicationVersionStatusType,
} from '@stellode/models';

export type ApplicationListVersionCell =
  | { kind: 'empty' }
  | { kind: 'current'; version: string }
  | { kind: 'inactiveFallback'; version: string };

export const formatApplicationListVersion = (
  currentVersion: string | null,
  currentVersionStatus: ApplicationVersionStatusType | null,
): ApplicationListVersionCell => {
  if (currentVersion === null) return { kind: 'empty' };
  if (currentVersionStatus === ApplicationVersionStatus.Previous) {
    return { kind: 'inactiveFallback', version: currentVersion };
  }
  return { kind: 'current', version: currentVersion };
};
