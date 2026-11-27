import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { VersionStatus, type ArchitectureGraph } from '@stellode/models';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { appendFeatureVersionCompareHeading } from './append-feature-version-compare-heading';
import { buildDiagramPageHeading } from './build-diagram-entity-heading';
import { emptyUnitDiagramInstanceFilter } from './empty-unit-diagram-instance-filter';
import { emptyUnitFilterCatalog } from './empty-unit-filter-catalog';
import { featureVersionDiagramIsReadOnly } from './feature-version-diagram-is-read-only';
import type { FeatureVersionLegendRow } from './feature-version-legend-row';
import type { UnitVisibilityState } from './flat-diagram';
import { parentFeatureElementIdFromGraph } from './parent-feature-element-id-from-graph';
import { shouldResetFeatureVersionDiagramFilters } from './should-reset-feature-version-diagram-filters';
import type { SpaDiagramEntity } from './spa-diagram-paths';
import {
  defaultUnitDiagramVisibility,
  type UnitDiagramNodeKind,
} from './unit-diagram-type-visibility';
import type {
  UnitDiagramFilterCatalog,
  UnitDiagramInstanceFilter,
} from './unit-diagram-instance-filter-types';

export type DiagramEntity = SpaDiagramEntity | undefined;

export type UseDiagramFiltersParams = {
  readonly entity: DiagramEntity;
  readonly diagramAnchorId: string | undefined;
  readonly archGraph: ArchitectureGraph | null;
};

export type ApplyFeatureVersionCompare = (enabled: boolean) => Promise<void>;

export type DiagramFilters = {
  readonly unitInstanceFilter: UnitDiagramInstanceFilter;
  readonly unitInstanceFilterRef: RefObject<UnitDiagramInstanceFilter>;
  readonly unitFilterCatalog: UnitDiagramFilterCatalog;
  readonly setUnitFilterCatalog: (catalog: UnitDiagramFilterCatalog) => void;
  readonly handleUnitInstanceFilterChange: (next: UnitDiagramInstanceFilter) => void;
  readonly teamCodeOnly: boolean;
  readonly teamCodeOnlyRef: RefObject<boolean>;
  readonly handleTeamCodeOnlyChange: (codeOnly: boolean) => void;
  readonly componentNodeVisibility: UnitVisibilityState;
  readonly componentNodeVisibilityRef: RefObject<UnitVisibilityState>;
  readonly handleComponentTypeVisibilityChange: (
    kind: UnitDiagramNodeKind,
    visible: boolean,
  ) => void;
  readonly featureVersionTeamsVisible: boolean;
  readonly featureVersionTeamsVisibleRef: RefObject<boolean>;
  readonly handleFeatureVersionTeamsVisibleChange: (visible: boolean) => void;
  readonly featureVersionTableView: boolean;
  readonly handleFeatureVersionTableViewChange: (nextTableView: boolean) => void;
  readonly featureVersionCrossUnitLinksVisible: boolean;
  readonly featureVersionCrossUnitLinksVisibleRef: RefObject<boolean>;
  readonly handleFeatureVersionCrossUnitLinksVisibleChange: (visible: boolean) => void;
  readonly featureVersionCompareEnabled: boolean;
  readonly featureVersionCompareEnabledRef: RefObject<boolean>;
  readonly setFeatureVersionCompareEnabledSynced: (enabled: boolean) => void;
  readonly handleFeatureVersionCompareEnabledChange: (
    enabled: boolean,
    applyCompare: ApplyFeatureVersionCompare,
  ) => Promise<void>;
  readonly sortedFeatureLegendRows: readonly FeatureVersionLegendRow[];
  readonly featureVersionCompareInheritedFromId: string | null;
  readonly featureVersionCompareInheritedFromIdRef: RefObject<string | null>;
  readonly featureVersionLayoutIdsRef: RefObject<readonly string[]>;
  readonly featureVersionCompareAvailable: boolean;
  readonly isFeatureVersionDiagramReadOnly: boolean;
  readonly pageHeading: string;
  /** Сбрасывает фильтры при смене якоря/сущности; true — если сброшено сравнение версий фичи. */
  readonly resetFiltersForRoute: (entity: DiagramEntity, diagramAnchorId: string | undefined) => boolean;
};

type ResetForRoute = (entity: DiagramEntity, diagramAnchorId: string | undefined) => void;

type UnitFilters = Pick<
  DiagramFilters,
  | 'unitInstanceFilter'
  | 'unitInstanceFilterRef'
  | 'unitFilterCatalog'
  | 'setUnitFilterCatalog'
  | 'handleUnitInstanceFilterChange'
> & { readonly resetUnitFilters: ResetForRoute };

type TeamFilters = Pick<DiagramFilters, 'teamCodeOnly' | 'teamCodeOnlyRef' | 'handleTeamCodeOnlyChange'> & {
  readonly resetTeamFilters: ResetForRoute;
};

type ComponentFilters = Pick<
  DiagramFilters,
  | 'componentNodeVisibility'
  | 'componentNodeVisibilityRef'
  | 'handleComponentTypeVisibilityChange'
> & { readonly resetComponentFilters: ResetForRoute };

type FeatureVersionToggles = Pick<
  DiagramFilters,
  | 'featureVersionTeamsVisible'
  | 'featureVersionTeamsVisibleRef'
  | 'handleFeatureVersionTeamsVisibleChange'
  | 'featureVersionTableView'
  | 'handleFeatureVersionTableViewChange'
  | 'featureVersionCrossUnitLinksVisible'
  | 'featureVersionCrossUnitLinksVisibleRef'
  | 'handleFeatureVersionCrossUnitLinksVisibleChange'
  | 'featureVersionCompareEnabled'
  | 'featureVersionCompareEnabledRef'
  | 'setFeatureVersionCompareEnabledSynced'
  | 'handleFeatureVersionCompareEnabledChange'
> & {
  readonly resetFeatureVersionFilters: (
    entity: DiagramEntity,
    diagramAnchorId: string | undefined,
  ) => boolean;
};

type FeatureVersionLegend = Pick<
  DiagramFilters,
  | 'sortedFeatureLegendRows'
  | 'featureVersionCompareInheritedFromId'
  | 'featureVersionCompareInheritedFromIdRef'
  | 'featureVersionLayoutIdsRef'
  | 'featureVersionCompareAvailable'
>;

const diagramPageTitle = 'Диаграммы';

const featureVersionStatusRank = (status: string): number => {
  if (status === VersionStatus.Draft) return 0;
  if (status === VersionStatus.Active) return 1;
  if (status === VersionStatus.Deprecated) return 2;
  return 3;
};

const sortFeatureLegendRows = (
  rows: readonly FeatureVersionLegendRow[],
): FeatureVersionLegendRow[] =>
  [...rows].sort((left, right) => {
    const byStatus = featureVersionStatusRank(left.status) - featureVersionStatusRank(right.status);
    if (byStatus !== 0) return byStatus;
    return (right.versionNumber ?? 0) - (left.versionNumber ?? 0);
  });

const inheritedFromIdOf = (
  rows: readonly FeatureVersionLegendRow[],
  diagramAnchorId: string | undefined,
): string | null => {
  if (!diagramAnchorId) return null;
  const inherited = rows.find((item) => item.id === diagramAnchorId)?.inheritedFromId;
  return typeof inherited === 'string' && inherited !== '' ? inherited : null;
};

const isNonEmptyId = (id: string | null | undefined): id is string =>
  typeof id === 'string' && id.length > 0;

const useUnitFilters = (): UnitFilters => {
  const [unitInstanceFilter, setUnitInstanceFilter] = useState<UnitDiagramInstanceFilter>(
    emptyUnitDiagramInstanceFilter,
  );
  const unitInstanceFilterRef = useRef(unitInstanceFilter);
  unitInstanceFilterRef.current = unitInstanceFilter;
  const [unitFilterCatalog, setUnitFilterCatalog] =
    useState<UnitDiagramFilterCatalog>(emptyUnitFilterCatalog);
  const lastUnitHubAnchorRef = useRef<string>('');

  const handleUnitInstanceFilterChange = useCallback((next: UnitDiagramInstanceFilter) => {
    unitInstanceFilterRef.current = next;
    setUnitInstanceFilter(next);
  }, []);

  const resetUnitFilters = useCallback<ResetForRoute>((entity, diagramAnchorId) => {
    if (entity !== 'unit') {
      lastUnitHubAnchorRef.current = '';
      return;
    }
    if (!diagramAnchorId || diagramAnchorId === lastUnitHubAnchorRef.current) return;
    lastUnitHubAnchorRef.current = diagramAnchorId;
    const fresh = emptyUnitDiagramInstanceFilter();
    unitInstanceFilterRef.current = fresh;
    setUnitInstanceFilter(fresh);
    setUnitFilterCatalog(emptyUnitFilterCatalog());
  }, []);

  return {
    unitInstanceFilter,
    unitInstanceFilterRef,
    unitFilterCatalog,
    setUnitFilterCatalog,
    handleUnitInstanceFilterChange,
    resetUnitFilters,
  };
};

const useTeamFilters = (): TeamFilters => {
  const [teamCodeOnly, setTeamCodeOnly] = useState(false);
  const teamCodeOnlyRef = useRef(teamCodeOnly);
  teamCodeOnlyRef.current = teamCodeOnly;
  const lastTeamHubAnchorRef = useRef<string>('');

  const handleTeamCodeOnlyChange = useCallback((codeOnly: boolean) => {
    teamCodeOnlyRef.current = codeOnly;
    setTeamCodeOnly(codeOnly);
  }, []);

  const resetTeamFilters = useCallback<ResetForRoute>((entity, diagramAnchorId) => {
    if (entity !== 'team') {
      lastTeamHubAnchorRef.current = '';
      return;
    }
    if (!diagramAnchorId || diagramAnchorId === lastTeamHubAnchorRef.current) return;
    lastTeamHubAnchorRef.current = diagramAnchorId;
    teamCodeOnlyRef.current = false;
    setTeamCodeOnly(false);
  }, []);

  return { teamCodeOnly, teamCodeOnlyRef, handleTeamCodeOnlyChange, resetTeamFilters };
};

const useComponentFilters = (): ComponentFilters => {
  const [componentNodeVisibility, setComponentNodeVisibility] =
    useState<UnitVisibilityState>(defaultUnitDiagramVisibility);
  const componentNodeVisibilityRef = useRef(componentNodeVisibility);
  componentNodeVisibilityRef.current = componentNodeVisibility;
  const lastComponentHubAnchorRef = useRef<string>('');

  const handleComponentTypeVisibilityChange = useCallback(
    (kind: UnitDiagramNodeKind, visible: boolean) => {
      setComponentNodeVisibility((prev) => ({ ...prev, [kind]: visible }));
    },
    [],
  );

  const resetComponentFilters = useCallback<ResetForRoute>((entity, diagramAnchorId) => {
    if (entity !== 'component') {
      lastComponentHubAnchorRef.current = '';
      return;
    }
    if (!diagramAnchorId || diagramAnchorId === lastComponentHubAnchorRef.current) return;
    lastComponentHubAnchorRef.current = diagramAnchorId;
    const freshComponent = { ...defaultUnitDiagramVisibility };
    componentNodeVisibilityRef.current = freshComponent;
    setComponentNodeVisibility(freshComponent);
  }, []);

  return {
    componentNodeVisibility,
    componentNodeVisibilityRef,
    handleComponentTypeVisibilityChange,
    resetComponentFilters,
  };
};

const useSyncedFlag = (
  initial: boolean,
): readonly [boolean, RefObject<boolean>, (value: boolean) => void] => {
  const [value, setValue] = useState(initial);
  const valueRef = useRef(value);
  valueRef.current = value;
  const setSynced = useCallback((next: boolean) => {
    valueRef.current = next;
    setValue(next);
  }, []);
  return [value, valueRef, setSynced] as const;
};

const useFeatureVersionToggles = (): FeatureVersionToggles => {
  const [featureVersionTeamsVisible, featureVersionTeamsVisibleRef, setTeamsVisible] =
    useSyncedFlag(true);
  const [featureVersionTableView, setFeatureVersionTableView] = useState(false);
  const [
    featureVersionCrossUnitLinksVisible,
    featureVersionCrossUnitLinksVisibleRef,
    setCrossUnitLinksVisible,
  ] = useSyncedFlag(false);
  const [featureVersionCompareEnabled, featureVersionCompareEnabledRef, setCompareEnabled] =
    useSyncedFlag(false);
  const lastFeatureVersionHubAnchorRef = useRef<string>('');

  const handleFeatureVersionTableViewChange = useCallback(
    (nextTableView: boolean) => {
      if (nextTableView) setTeamsVisible(true);
      setFeatureVersionTableView(nextTableView);
    },
    [setTeamsVisible],
  );

  const handleFeatureVersionCompareEnabledChange = useCallback(
    (enabled: boolean, applyCompare: ApplyFeatureVersionCompare): Promise<void> =>
      applyCompare(enabled),
    [],
  );

  const resetFeatureVersionFilters = useCallback(
    (entity: DiagramEntity, diagramAnchorId: string | undefined): boolean => {
      if (entity !== 'feature-version') {
        lastFeatureVersionHubAnchorRef.current = '';
        setTeamsVisible(true);
        setFeatureVersionTableView(false);
        setCrossUnitLinksVisible(false);
        setCompareEnabled(false);
        return true;
      }
      if (!diagramAnchorId || diagramAnchorId === lastFeatureVersionHubAnchorRef.current) {
        return false;
      }
      const resetFilters = shouldResetFeatureVersionDiagramFilters(
        lastFeatureVersionHubAnchorRef.current,
      );
      lastFeatureVersionHubAnchorRef.current = diagramAnchorId;
      if (!resetFilters) return false;
      setTeamsVisible(true);
      setCrossUnitLinksVisible(false);
      setCompareEnabled(false);
      return true;
    },
    [setTeamsVisible, setCrossUnitLinksVisible, setCompareEnabled],
  );

  return {
    featureVersionTeamsVisible,
    featureVersionTeamsVisibleRef,
    handleFeatureVersionTeamsVisibleChange: setTeamsVisible,
    featureVersionTableView,
    handleFeatureVersionTableViewChange,
    featureVersionCrossUnitLinksVisible,
    featureVersionCrossUnitLinksVisibleRef,
    handleFeatureVersionCrossUnitLinksVisibleChange: setCrossUnitLinksVisible,
    featureVersionCompareEnabled,
    featureVersionCompareEnabledRef,
    setFeatureVersionCompareEnabledSynced: setCompareEnabled,
    handleFeatureVersionCompareEnabledChange,
    resetFeatureVersionFilters,
  };
};

const useFeatureVersionLegendRows = (
  featureElementIdForLegend: string | null,
): readonly FeatureVersionLegendRow[] => {
  const [featureVersionsForLegend, setFeatureVersionsForLegend] = useState<
    FeatureVersionLegendRow[]
  >([]);

  useEffect(() => {
    if (!featureElementIdForLegend) {
      setFeatureVersionsForLegend([]);
      return;
    }
    let cancelled = false;
    void featureVersionsApi
      .list<FeatureVersionLegendRow>(featureElementIdForLegend)
      .then((data) => {
        if (!cancelled) setFeatureVersionsForLegend(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setFeatureVersionsForLegend([]);
      });
    return () => {
      cancelled = true;
    };
  }, [featureElementIdForLegend]);

  return featureVersionsForLegend;
};

const useFeatureVersionLegend = ({
  entity,
  diagramAnchorId,
  archGraph,
}: UseDiagramFiltersParams): FeatureVersionLegend => {
  const featureElementIdForLegend = useMemo((): string | null => {
    if (!diagramAnchorId || entity !== 'feature-version' || !archGraph) return null;
    return parentFeatureElementIdFromGraph(archGraph, diagramAnchorId);
  }, [entity, diagramAnchorId, archGraph]);
  const featureVersionsForLegend = useFeatureVersionLegendRows(featureElementIdForLegend);
  const sortedFeatureLegendRows = useMemo(
    () => sortFeatureLegendRows(featureVersionsForLegend),
    [featureVersionsForLegend],
  );
  const featureVersionCompareInheritedFromId = useMemo(
    () => inheritedFromIdOf(featureVersionsForLegend, diagramAnchorId),
    [diagramAnchorId, featureVersionsForLegend],
  );
  const featureVersionCompareInheritedFromIdRef = useRef(featureVersionCompareInheritedFromId);
  featureVersionCompareInheritedFromIdRef.current = featureVersionCompareInheritedFromId;
  const featureVersionLayoutIdsRef = useRef<readonly string[]>([]);
  featureVersionLayoutIdsRef.current = [diagramAnchorId, featureVersionCompareInheritedFromId].filter(
    isNonEmptyId,
  );

  return {
    sortedFeatureLegendRows,
    featureVersionCompareInheritedFromId,
    featureVersionCompareInheritedFromIdRef,
    featureVersionLayoutIdsRef,
    featureVersionCompareAvailable: featureVersionCompareInheritedFromId !== null,
  };
};

type PageHeadingParams = UseDiagramFiltersParams & {
  readonly compareEnabled: boolean;
  readonly inheritedFromId: string | null;
  readonly legendRows: readonly FeatureVersionLegendRow[];
};

const buildCompareHeading = (
  archGraph: ArchitectureGraph,
  diagramAnchorId: string,
  selected: FeatureVersionLegendRow,
  previous: FeatureVersionLegendRow,
): string => {
  const featureId = parentFeatureElementIdFromGraph(archGraph, diagramAnchorId);
  const featureNode =
    featureId === null ? undefined : archGraph.nodes.find((node) => node.id === featureId);
  const featureLabel = featureNode?.name ? `Фича ${featureNode.name}` : 'Фича';
  return appendFeatureVersionCompareHeading(
    featureLabel,
    { version: selected.version, status: selected.status },
    { version: previous.version, status: previous.status },
  );
};

const buildPageHeading = ({
  entity,
  diagramAnchorId,
  archGraph,
  compareEnabled,
  inheritedFromId,
  legendRows,
}: PageHeadingParams): string => {
  const base = buildDiagramPageHeading({
    kind: 'entityRoute',
    entity,
    diagramAnchorId,
    archGraph,
    fallbackTitle: diagramPageTitle,
  });
  if (
    entity !== 'feature-version' ||
    !compareEnabled ||
    inheritedFromId === null ||
    !diagramAnchorId ||
    !archGraph
  ) {
    return base;
  }
  const selected = legendRows.find((row) => row.id === diagramAnchorId);
  const previous = legendRows.find((row) => row.id === inheritedFromId);
  if (selected === undefined || previous === undefined) return base;
  return buildCompareHeading(archGraph, diagramAnchorId, selected, previous);
};

export const useDiagramFilters = (params: UseDiagramFiltersParams): DiagramFilters => {
  const { entity, diagramAnchorId, archGraph } = params;
  const { resetUnitFilters, ...unitFilters } = useUnitFilters();
  const { resetTeamFilters, ...teamFilters } = useTeamFilters();
  const { resetComponentFilters, ...componentFilters } = useComponentFilters();
  const { resetFeatureVersionFilters, ...featureVersionToggles } = useFeatureVersionToggles();
  const legend = useFeatureVersionLegend(params);
  const { featureVersionCompareEnabled } = featureVersionToggles;

  const isFeatureVersionDiagramReadOnly = useMemo(
    () =>
      featureVersionDiagramIsReadOnly(entity, diagramAnchorId, archGraph) ||
      featureVersionCompareEnabled,
    [entity, diagramAnchorId, archGraph, featureVersionCompareEnabled],
  );

  const pageHeading = useMemo(
    () =>
      buildPageHeading({
        entity,
        diagramAnchorId,
        archGraph,
        compareEnabled: featureVersionCompareEnabled,
        inheritedFromId: legend.featureVersionCompareInheritedFromId,
        legendRows: legend.sortedFeatureLegendRows,
      }),
    [
      entity,
      diagramAnchorId,
      archGraph,
      featureVersionCompareEnabled,
      legend.featureVersionCompareInheritedFromId,
      legend.sortedFeatureLegendRows,
    ],
  );

  const resetFiltersForRoute = useCallback(
    (nextEntity: DiagramEntity, nextAnchorId: string | undefined): boolean => {
      resetUnitFilters(nextEntity, nextAnchorId);
      resetTeamFilters(nextEntity, nextAnchorId);
      resetComponentFilters(nextEntity, nextAnchorId);
      return resetFeatureVersionFilters(nextEntity, nextAnchorId);
    },
    [resetUnitFilters, resetTeamFilters, resetComponentFilters, resetFeatureVersionFilters],
  );

  return {
    ...unitFilters,
    ...teamFilters,
    ...componentFilters,
    ...featureVersionToggles,
    ...legend,
    isFeatureVersionDiagramReadOnly,
    pageHeading,
    resetFiltersForRoute,
  };
};
