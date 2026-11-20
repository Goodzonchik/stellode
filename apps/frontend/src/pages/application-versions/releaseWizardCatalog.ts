import { parseVersionStatus, type VersionStatus } from '@stellode/models';
import type { ComponentVersionApplicationUsage } from '@stellode/models';
import type { ReleaseComponentRow, ReleaseNewerVersion } from './releaseWizardTypes';

export type UnitComponentCatalog = {
  component: { id: string; name: string };
  team: ReleaseComponentRow['team'];
  versions: Array<{
    id: string;
    componentId?: string;
    version: string;
    versionNumber?: number;
    status: VersionStatus;
    usage?: ComponentVersionApplicationUsage[];
  }>;
};

const mapVersionRow = (value: Record<string, unknown>) => ({
  ...value,
  status: parseVersionStatus(value.status) ?? 'unactive',
}) as UnitComponentCatalog['versions'][number];

export const normalizeUnitComponents = (data: unknown): UnitComponentCatalog[] => {
  if (!Array.isArray(data)) return [];
  return data.map((item): UnitComponentCatalog => {
    const record = item as Record<string, unknown>;
    const versionsRaw = Array.isArray(record.versions) ? record.versions : [];
    return {
      component: record.component as UnitComponentCatalog['component'],
      team: (record.team as UnitComponentCatalog['team']) ?? null,
      versions: versionsRaw.map((versionItem) =>
        mapVersionRow(
          typeof versionItem === 'object' && versionItem !== null
            ? (versionItem as Record<string, unknown>)
            : {},
        ),
      ),
    };
  });
};

const parseNewerVersion = (item: unknown): ReleaseNewerVersion | null => {
  if (typeof item !== 'object' || item === null) return null;
  const record = item as Record<string, unknown>;
  const id = String(record.id ?? '');
  if (id.length === 0) return null;
  return {
    id,
    version: String(record.version ?? ''),
    versionNumber: Number(record.versionNumber ?? 0),
    status: parseVersionStatus(record.status) ?? 'unactive',
  };
};

export const parseReleaseComponentRow = (item: unknown): ReleaseComponentRow | null => {
  if (typeof item !== 'object' || item === null) return null;
  const record = item as Record<string, unknown>;
  const componentVersionRaw = record.componentVersion;
  if (typeof componentVersionRaw !== 'object' || componentVersionRaw === null) return null;
  const cv = componentVersionRaw as Record<string, unknown>;
  const status = parseVersionStatus(cv.status) ?? 'unactive';
  const applicationStatusRaw = String(record.applicationStatus ?? 'active');
  const applicationStatus =
    applicationStatusRaw === 'deprecated' ? ('deprecated' as const) : ('active' as const);
  const otherRaw = record.otherApplications;
  const otherApplications = Array.isArray(otherRaw)
    ? otherRaw
        .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
        .map((row) => ({
          applicationId: String(row.applicationId ?? ''),
          applicationName: String(row.applicationName ?? ''),
          status: String(row.status ?? '') === 'deprecated' ? ('deprecated' as const) : ('active' as const),
        }))
        .filter((row) => row.applicationId.length > 0)
    : [];
  const newerRaw = record.newerVersions;
  const newerVersions = Array.isArray(newerRaw)
    ? newerRaw
        .map(parseNewerVersion)
        .filter((row): row is ReleaseNewerVersion => row !== null)
    : [];
  const componentRaw = record.component;
  if (typeof componentRaw !== 'object' || componentRaw === null) return null;
  const component = componentRaw as { id: string; name: string };
  return {
    component,
    team: (record.team as ReleaseComponentRow['team']) ?? null,
    componentVersion: {
      id: String(cv.id ?? ''),
      componentId: String(cv.componentId ?? component.id),
      version: String(cv.version ?? ''),
      versionNumber: Number(cv.versionNumber ?? 0),
      status,
    },
    applicationStatus,
    otherApplications,
    hasNewerVersion: Boolean(record.hasNewerVersion) || newerVersions.length > 0,
    newerVersions,
  };
};

export const uniqReleaseRowsByCvId = (rows: ReleaseComponentRow[]): ReleaseComponentRow[] =>
  rows.filter(
    (row, index) =>
      rows.findIndex((other) => other.componentVersion.id === row.componentVersion.id) === index,
  );
