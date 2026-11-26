import { VersionStatus, type VersionStatus as VersionStatusType } from './version-status';
import type { ApplicationComponentStatus } from './derive-component-version-status';

export type CompositionApplicationStatusRow = {
  componentId: string;
  componentVersionId: string;
  lifecycleStatus: VersionStatusType;
  applicationStatus: ApplicationComponentStatus;
};

export const defaultApplicationStatusForLifecycle = (
  lifecycleStatus: VersionStatusType,
): ApplicationComponentStatus => {
  if (lifecycleStatus === VersionStatus.Draft) return VersionStatus.Active;
  if (lifecycleStatus === VersionStatus.Deprecated) return VersionStatus.Deprecated;
  return VersionStatus.Active;
};

export const isApplicationStatusLockedToActive = (
  lifecycleStatus: VersionStatusType,
): boolean => lifecycleStatus === VersionStatus.Draft;

const demoteSameComponentRows = (
  rows: readonly CompositionApplicationStatusRow[],
  componentId: string,
  exceptComponentVersionId: string,
): CompositionApplicationStatusRow[] =>
  rows.map((row) =>
    row.componentId === componentId && row.componentVersionId !== exceptComponentVersionId
      ? { ...row, applicationStatus: VersionStatus.Deprecated }
      : row,
  );

export const applyApplicationStatusChange = (
  rows: readonly CompositionApplicationStatusRow[],
  componentVersionId: string,
  nextStatus: ApplicationComponentStatus,
): CompositionApplicationStatusRow[] => {
  const target = rows.find((row) => row.componentVersionId === componentVersionId);
  if (!target) return [...rows];
  if (isApplicationStatusLockedToActive(target.lifecycleStatus) && nextStatus !== VersionStatus.Active) {
    return [...rows];
  }
  const withStatus = rows.map((row) =>
    row.componentVersionId === componentVersionId
      ? { ...row, applicationStatus: nextStatus }
      : row,
  );
  if (nextStatus !== VersionStatus.Active) return withStatus;
  return demoteSameComponentRows(withStatus, target.componentId, componentVersionId);
};

export const mergeAddedCompositionRow = (
  rows: readonly CompositionApplicationStatusRow[],
  added: CompositionApplicationStatusRow,
): CompositionApplicationStatusRow[] => {
  const applicationStatus = defaultApplicationStatusForLifecycle(added.lifecycleStatus);
  const nextRow: CompositionApplicationStatusRow = { ...added, applicationStatus };
  const withoutDuplicate = rows.filter(
    (row) => row.componentVersionId !== added.componentVersionId,
  );
  if (applicationStatus !== VersionStatus.Active) {
    return [...withoutDuplicate, nextRow];
  }
  const demoted = demoteSameComponentRows(
    withoutDuplicate,
    added.componentId,
    added.componentVersionId,
  );
  return [...demoted, nextRow];
};

export const bumpCompositionRow = (
  rows: readonly CompositionApplicationStatusRow[],
  fromComponentVersionId: string,
  nextVersion: Pick<
    CompositionApplicationStatusRow,
    'componentVersionId' | 'lifecycleStatus'
  >,
): CompositionApplicationStatusRow[] => {
  const source = rows.find((row) => row.componentVersionId === fromComponentVersionId);
  if (!source) return [...rows];
  if (source.componentVersionId === nextVersion.componentVersionId) return [...rows];
  const withoutSource = rows.filter(
    (row) => row.componentVersionId !== fromComponentVersionId,
  );
  return mergeAddedCompositionRow(withoutSource, {
    componentId: source.componentId,
    componentVersionId: nextVersion.componentVersionId,
    lifecycleStatus: nextVersion.lifecycleStatus,
    applicationStatus: defaultApplicationStatusForLifecycle(nextVersion.lifecycleStatus),
  });
};

export const componentIdsWithoutActiveRow = (
  rows: readonly CompositionApplicationStatusRow[],
): string[] => {
  const byComponent = new Map<string, CompositionApplicationStatusRow[]>();
  for (const row of rows) {
    const list = byComponent.get(row.componentId) ?? [];
    list.push(row);
    byComponent.set(row.componentId, list);
  }
  return [...byComponent.entries()]
    .filter(([, list]) => !list.some((row) => row.applicationStatus === VersionStatus.Active))
    .map(([componentId]) => componentId);
};

export const findDuplicateActiveComponentIds = (
  rows: readonly Pick<
    CompositionApplicationStatusRow,
    'componentId' | 'componentVersionId' | 'applicationStatus'
  >[],
): string[] => {
  const activeByComponent = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    if (row.applicationStatus !== VersionStatus.Active) continue;
    if (!row.componentId) continue;
    const previous = activeByComponent.get(row.componentId);
    if (previous && previous !== row.componentVersionId) {
      duplicates.add(row.componentId);
      continue;
    }
    activeByComponent.set(row.componentId, row.componentVersionId);
  }
  return [...duplicates];
};
