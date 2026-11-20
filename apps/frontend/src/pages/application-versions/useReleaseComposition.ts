import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applicationVersionsApi } from '../../api/application-versions-api';
import { componentVersionsApi } from '../../api/component-versions-api';
import {
  applyApplicationStatusChange,
  bumpCompositionRow,
  componentIdsWithoutActiveRow,
  defaultApplicationStatusForLifecycle,
  mergeAddedCompositionRow,
  type CompositionApplicationStatusRow,
} from './releaseCompositionRules';
import {
  normalizeUnitComponents,
  parseReleaseComponentRow,
  uniqReleaseRowsByCvId,
  type UnitComponentCatalog,
} from './releaseWizardCatalog';
import type { ReleaseComponentRow } from './releaseWizardTypes';
import type { ApplicationComponentStatus, ReleaseComponentSelectionDto } from '@stellode/models';
import { ToastVariant, useToast } from '../../hooks/useToast';

const cloneReleaseRows = (source: ReleaseComponentRow[]): ReleaseComponentRow[] =>
  source.map((rowItem) => ({
    ...rowItem,
    component: { ...rowItem.component },
    componentVersion: { ...rowItem.componentVersion },
    team: rowItem.team ? { ...rowItem.team } : null,
    otherApplications: [...rowItem.otherApplications],
    newerVersions: rowItem.newerVersions.map((item) => ({ ...item })),
  }));

const toCompositionSlice = (row: ReleaseComponentRow): CompositionApplicationStatusRow => ({
  componentId: row.component.id,
  componentVersionId: row.componentVersion.id,
  lifecycleStatus: row.componentVersion.status,
  applicationStatus: row.applicationStatus,
});

const applyCompositionSlice = (
  row: ReleaseComponentRow,
  slice: CompositionApplicationStatusRow,
): ReleaseComponentRow => ({
  ...row,
  applicationStatus: slice.applicationStatus,
});

const mergeCompositionIntoRows = (
  rows: ReleaseComponentRow[],
  composition: CompositionApplicationStatusRow[],
): ReleaseComponentRow[] => {
  const byId = new Map(composition.map((slice) => [slice.componentVersionId, slice]));
  return rows.map((row) => {
    const slice = byId.get(row.componentVersion.id);
    return slice ? applyCompositionSlice(row, slice) : row;
  });
};

const readMessage = (errorValue: unknown): string | undefined =>
  errorValue && typeof errorValue === 'object' && 'response' in errorValue
    ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;

export type CatalogPickItem = {
  component: { id: string; name: string };
  team: ReleaseComponentRow['team'];
  componentVersion: ReleaseComponentRow['componentVersion'];
  usageCount: number;
};

export type UseReleaseCompositionParams = {
  enabled: boolean;
  sourceApplicationVersionId: string | null;
  unitId: string | undefined;
};

export type UseReleaseCompositionResult = {
  rows: ReleaseComponentRow[];
  initialReleaseRows: ReleaseComponentRow[];
  unitComponents: UnitComponentCatalog[];
  loadAvailable: () => Promise<void>;
  addComponentVersions: (picks: CatalogPickItem[]) => void;
  bumpVersion: (fromComponentVersionId: string, toComponentVersionId: string) => void;
  removeCv: (componentVersionId: string) => void;
  setApplicationStatus: (componentVersionId: string, status: ApplicationComponentStatus) => void;
  rowsOrderedForDisplay: ReleaseComponentRow[];
  componentsPayload: ReleaseComponentSelectionDto[];
  componentsMissingActiveWarning: string[];
};

export const useReleaseComposition = (
  params: UseReleaseCompositionParams,
): UseReleaseCompositionResult => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ReleaseComponentRow[]>([]);
  const [initialReleaseRows, setInitialReleaseRows] = useState<ReleaseComponentRow[]>([]);
  const [unitComponents, setUnitComponents] = useState<UnitComponentCatalog[]>([]);
  const fetchGenRef = useRef(0);

  useEffect(() => {
    if (!params.enabled) return;
    const fetchGen = ++fetchGenRef.current;
    setUnitComponents([]);
    setRows([]);
    setInitialReleaseRows([]);

    const sourceApplicationVersionId = params.sourceApplicationVersionId;
    if (sourceApplicationVersionId === null) return;

    const run = async () => {
      try {
        const data = await applicationVersionsApi.releaseComponents<unknown[]>({
          applicationVersionId: sourceApplicationVersionId,
        });
        if (fetchGen !== fetchGenRef.current) return;
        const parsed = uniqReleaseRowsByCvId(
          (Array.isArray(data) ? data : [])
            .map(parseReleaseComponentRow)
            .filter((row): row is ReleaseComponentRow => row !== null),
        );
        setRows(parsed);
        setInitialReleaseRows(cloneReleaseRows(parsed));
      } catch (errorValue: unknown) {
        if (fetchGen !== fetchGenRef.current) return;
        showToast(
          readMessage(errorValue) || 'Не удалось загрузить компоненты релиза',
          ToastVariant.Error,
        );
      }
    };
    void run();
  }, [params.enabled, params.sourceApplicationVersionId, showToast]);

  const loadAvailable = useCallback(async () => {
    if (!params.unitId) return;
    try {
      const data = await componentVersionsApi.forUnit(params.unitId);
      setUnitComponents(normalizeUnitComponents(data));
    } catch (errorValue: unknown) {
      showToast(
        readMessage(errorValue) || 'Не удалось загрузить компоненты unit',
        ToastVariant.Error,
      );
    }
  }, [params.unitId, showToast]);

  const addComponentVersions = useCallback((picks: CatalogPickItem[]) => {
    if (picks.length === 0) return;
    setRows((previous) => {
      let composition = previous.map(toCompositionSlice);
      const byCvId = new Map(previous.map((row) => [row.componentVersion.id, row]));
      for (const picked of picks) {
        composition = mergeAddedCompositionRow(composition, {
          componentId: picked.component.id,
          componentVersionId: picked.componentVersion.id,
          lifecycleStatus: picked.componentVersion.status,
          applicationStatus: defaultApplicationStatusForLifecycle(
            picked.componentVersion.status,
          ),
        });
        const slice = composition.find(
          (row) => row.componentVersionId === picked.componentVersion.id,
        );
        byCvId.set(picked.componentVersion.id, {
          component: picked.component,
          team: picked.team,
          componentVersion: picked.componentVersion,
          applicationStatus: slice?.applicationStatus ?? 'active',
          otherApplications: [],
          hasNewerVersion: false,
          newerVersions: [],
        });
      }
      const nextRows = [...byCvId.values()];
      return uniqReleaseRowsByCvId(mergeCompositionIntoRows(nextRows, composition));
    });
  }, []);

  const bumpVersion = useCallback(
    (fromComponentVersionId: string, toComponentVersionId: string) => {
      setRows((previous) => {
        const source = previous.find(
          (row) => row.componentVersion.id === fromComponentVersionId,
        );
        if (!source) return previous;
        const nextCv = source.newerVersions.find((item) => item.id === toComponentVersionId);
        if (!nextCv) return previous;
        const composition = bumpCompositionRow(
          previous.map(toCompositionSlice),
          fromComponentVersionId,
          {
            componentVersionId: toComponentVersionId,
            lifecycleStatus: nextCv.status,
          },
        );
        const withoutSource = previous.filter(
          (row) => row.componentVersion.id !== fromComponentVersionId,
        );
        const existingTarget = withoutSource.find(
          (row) => row.componentVersion.id === toComponentVersionId,
        );
        if (existingTarget) {
          return mergeCompositionIntoRows(withoutSource, composition);
        }
        const remainingNewer = source.newerVersions.filter(
          (item) => item.versionNumber > nextCv.versionNumber,
        );
        const bumpedRow: ReleaseComponentRow = {
          ...source,
          componentVersion: {
            id: nextCv.id,
            componentId: source.component.id,
            version: nextCv.version,
            versionNumber: nextCv.versionNumber,
            status: nextCv.status,
          },
          otherApplications: [],
          hasNewerVersion: remainingNewer.length > 0,
          newerVersions: remainingNewer,
          applicationStatus: defaultApplicationStatusForLifecycle(nextCv.status),
        };
        return uniqReleaseRowsByCvId(
          mergeCompositionIntoRows([...withoutSource, bumpedRow], composition),
        );
      });
    },
    [],
  );

  const removeCv = useCallback((componentVersionId: string) => {
    setRows((previous) =>
      previous.filter((row) => row.componentVersion.id !== componentVersionId),
    );
  }, []);

  const setApplicationStatus = useCallback(
    (componentVersionId: string, status: ApplicationComponentStatus) => {
      setRows((previous) => {
        const nextComposition = applyApplicationStatusChange(
          previous.map(toCompositionSlice),
          componentVersionId,
          status,
        );
        return mergeCompositionIntoRows(previous, nextComposition);
      });
    },
    [],
  );

  const rowsOrderedForDisplay = useMemo(() => {
    const baselineIds = new Set(initialReleaseRows.map((row) => row.componentVersion.id));
    const addedDuringWizard: ReleaseComponentRow[] = [];
    const fromBaseline: ReleaseComponentRow[] = [];
    for (const row of rows) {
      if (baselineIds.has(row.componentVersion.id)) fromBaseline.push(row);
      else addedDuringWizard.push(row);
    }
    return [...addedDuringWizard, ...fromBaseline];
  }, [rows, initialReleaseRows]);

  const componentsPayload = useMemo(
    (): ReleaseComponentSelectionDto[] =>
      rowsOrderedForDisplay.map((row) => ({
        componentVersionId: row.componentVersion.id,
        status: row.applicationStatus,
      })),
    [rowsOrderedForDisplay],
  );

  const componentsMissingActiveWarning = useMemo(() => {
    const missing = componentIdsWithoutActiveRow(rowsOrderedForDisplay.map(toCompositionSlice));
    const names = new Set<string>();
    for (const componentId of missing) {
      const name = rowsOrderedForDisplay.find((row) => row.component.id === componentId)?.component
        .name;
      if (name) names.add(name);
    }
    return [...names];
  }, [rowsOrderedForDisplay]);

  return {
    rows,
    initialReleaseRows,
    unitComponents,
    loadAvailable,
    addComponentVersions,
    bumpVersion,
    removeCv,
    setApplicationStatus,
    rowsOrderedForDisplay,
    componentsPayload,
    componentsMissingActiveWarning,
  };
};
