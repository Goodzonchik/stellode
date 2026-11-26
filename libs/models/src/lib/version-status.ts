export const VersionStatus = {
  Draft: 'draft',
  Active: 'active',
  Deprecated: 'deprecated',
  Unactive: 'unactive',
} as const;

export type VersionStatus = (typeof VersionStatus)[keyof typeof VersionStatus];

const featureVersionTransitions: Readonly<Record<VersionStatus, readonly VersionStatus[]>> = {
  [VersionStatus.Draft]: [VersionStatus.Active],
  [VersionStatus.Active]: [VersionStatus.Draft, VersionStatus.Unactive],
  [VersionStatus.Deprecated]: [],
  [VersionStatus.Unactive]: [VersionStatus.Active],
};

export const versionStatusValues = Object.values(VersionStatus) as VersionStatus[];

export const parseVersionStatus = (raw: unknown): VersionStatus | null => {
  if (typeof raw !== 'string') return null;
  return versionStatusValues.includes(raw as VersionStatus) ? (raw as VersionStatus) : null;
};

export const allowedTargetsFeatureVersion = (from: VersionStatus): VersionStatus[] =>
  Array.from(featureVersionTransitions[from] ?? []);

