import {
  ApplicationVersionStatus as ApplicationVersionStatusConst,
  VersionStatus as VersionStatusConst,
  type ApplicationVersionStatus,
  type VersionStatus,
} from '@stellode/models';

export const versionStatusLabel = (status: VersionStatus): string => {
  const labels: Record<VersionStatus, string> = {
    [VersionStatusConst.Draft]: 'Черновик',
    [VersionStatusConst.Active]: 'Активна',
    [VersionStatusConst.Deprecated]: 'Устарела',
    [VersionStatusConst.Unactive]: 'Неактивна',
  };
  return labels[status];
};

export const releaseStatusLabel = (status: ApplicationVersionStatus): string => {
  const labels: Record<ApplicationVersionStatus, string> = {
    [ApplicationVersionStatusConst.Current]: 'Текущий',
    [ApplicationVersionStatusConst.Previous]: 'Предыдущий',
  };
  return labels[status];
};

export const componentInReleaseStatusLabel = (status: 'active' | 'deprecated'): string => {
  if (status === 'active') return 'Активен';
  return 'Устарел';
};

export const serviceStatusLabel = (status: string | undefined): string => {
  if (status === 'archive') return 'В архиве';
  return 'Активна';
};

export const versionStatusLabelFromRaw = (raw: string | undefined): string => {
  if (raw === VersionStatusConst.Draft) return 'Черновик';
  if (raw === VersionStatusConst.Active) return 'Активна';
  if (raw === VersionStatusConst.Deprecated) return 'Устарела';
  if (raw === VersionStatusConst.Unactive) return 'Неактивна';
  if (raw === undefined || raw.trim().length === 0) return '—';
  return raw.trim();
};
