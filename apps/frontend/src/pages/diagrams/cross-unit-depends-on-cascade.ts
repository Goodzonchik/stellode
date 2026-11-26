import { VersionStatus } from '@stellode/models';

export type CrossUnitCascadeOption = {
  readonly value: string;
  readonly label: string;
};

export type CrossUnitComponentVersionLite = {
  readonly id: string;
  readonly version?: unknown;
  readonly status?: string;
  readonly isPublic?: boolean;
  readonly applicationId?: string;
  readonly applicationName?: string;
};

const allowedTargetStatuses = new Set<string>([
  VersionStatus.Active,
  VersionStatus.Deprecated,
  VersionStatus.Draft,
]);

export const pickSoleOptionValue = (
  options: ReadonlyArray<CrossUnitCascadeOption>,
): string | null => (options.length === 1 ? options[0].value : null);

export const collectProviderApplicationsFromUses = (
  componentVersions: ReadonlyArray<CrossUnitComponentVersionLite>,
): ReadonlyArray<CrossUnitCascadeOption> => {
  const byId = new Map<string, string>();
  for (const cv of componentVersions) {
    const applicationId =
      typeof cv.applicationId === 'string' ? cv.applicationId.trim() : '';
    if (applicationId.length === 0) continue;
    const name =
      typeof cv.applicationName === 'string' && cv.applicationName.trim().length > 0
        ? cv.applicationName.trim()
        : applicationId;
    if (!byId.has(applicationId)) byId.set(applicationId, name);
  }
  return [...byId.entries()].map(([value, label]) => ({ value, label }));
};

export const collectPublicCvOptionsForApplication = (
  componentVersions: ReadonlyArray<CrossUnitComponentVersionLite>,
  applicationId: string | null,
): ReadonlyArray<CrossUnitCascadeOption> => {
  if (applicationId === null || applicationId.trim().length === 0) return [];
  const selectedApp = applicationId.trim();
  const seen = new Set<string>();
  const options: CrossUnitCascadeOption[] = [];
  for (const cv of componentVersions) {
    if (cv.isPublic !== true) continue;
    if (typeof cv.status !== 'string' || !allowedTargetStatuses.has(cv.status)) continue;
    const cvApp =
      typeof cv.applicationId === 'string' ? cv.applicationId.trim() : '';
    if (cvApp !== selectedApp) continue;
    if (seen.has(cv.id)) continue;
    seen.add(cv.id);
    options.push({
      value: cv.id,
      label: `v${String(cv.version ?? '')} (${String(cv.status ?? '')})`,
    });
  }
  return options;
};

export const resolveCascadeSelection = (
  options: ReadonlyArray<CrossUnitCascadeOption>,
  current: string | null,
): string | null => {
  const sole = pickSoleOptionValue(options);
  if (sole !== null) return sole;
  if (current !== null && options.some((option) => option.value === current)) {
    return current;
  }
  return null;
};
