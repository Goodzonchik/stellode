import {
  ApplicationVersionStatus as ApplicationVersionStatusConst,
  VersionStatus as VersionStatusConst,
  parseVersionStatus,
  type ApplicationVersionStatus,
  type VersionStatus,
} from '@stellode/models';

const versionStatusLabels: Record<VersionStatus, string> = {
  [VersionStatusConst.Draft]: 'Черновик',
  [VersionStatusConst.Active]: 'Активна',
  [VersionStatusConst.Deprecated]: 'Устарела',
  [VersionStatusConst.Unactive]: 'Неактивна',
};

export const versionStatusLabel = (status: VersionStatus): string =>
  versionStatusLabels[status];

export const releaseStatusLabel = (status: ApplicationVersionStatus): string => {
  const labels: Record<ApplicationVersionStatus, string> = {
    [ApplicationVersionStatusConst.Current]: 'Текущий',
    [ApplicationVersionStatusConst.Previous]: 'Предыдущий',
  };
  return labels[status];
};

export const versionStatusLabelFromRaw = (raw: string | undefined): string => {
  if (raw === undefined || raw.trim().length === 0) return '—';
  const parsed = parseVersionStatus(raw);
  if (parsed !== null) return versionStatusLabel(parsed);
  return raw.trim();
};
