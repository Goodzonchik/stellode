import { VersionStatus, type ApplicationComponentStatus } from '@stellode/models';

export type CompositionApplicationStatusRow = {
  componentId: string;
  componentVersionId: string;
  lifecycleStatus: VersionStatus;
  applicationStatus: ApplicationComponentStatus;
};

export const defaultApplicationStatusForLifecycle = (
  lifecycleStatus: VersionStatus,
): ApplicationComponentStatus => {
  if (lifecycleStatus === VersionStatus.Draft) return VersionStatus.Active;
  if (lifecycleStatus === VersionStatus.Deprecated) return VersionStatus.Deprecated;
  return VersionStatus.Active;
};

export const isApplicationStatusLockedToActive = (lifecycleStatus: VersionStatus): boolean =>
  lifecycleStatus === VersionStatus.Draft;

export const demoteSameComponentRows = (
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
