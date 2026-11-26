import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { componentVersionsApi } from '../../api/component-versions-api';
import { diagramsApi } from '../../api/diagrams-api';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { impactApi } from '../../api/impact-api';
import {
  useNodesState,
  useEdgesState,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import { architectureGraphToDiagram } from '../../common/architecture-graph-to-diagram';
import { Button } from 'antd';
import { AddFeatureDependsOnDialog } from './AddFeatureDependsOnDialog';
import { prepareDependsOnCanvasEdges } from './prepare-depends-on-canvas-edges';
import {
  collectFeatureVersionUsesCvOptions,
  type FeatureVersionUsesCvOption,
} from './collect-feature-version-uses-cv-options';
import { ExcludeComponentFromFeatureDialog } from './ExcludeComponentFromFeatureDialog';
import { DeleteFeatureDependsOnDialog } from './DeleteFeatureDependsOnDialog';
import { buildEdgeContextMenuItems } from './build-edge-context-menu-items';
import { resolveEdgeDependsOnApps } from './resolve-edge-depends-on-apps';
import { FeatureReadinessModal } from '../../components/FeatureReadinessModal';
import { getErrorMessage } from '../../utils/axios-error';
import { useFeatureVersionReadinessCheck } from '../../hooks/useFeatureVersionReadinessCheck';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { useUnit } from '../../context/UnitContext';
import { ComponentCreateDialog } from '../components/ComponentCreateDialog';
import { AddComponentDialog, type SelectedVersion } from './AddComponentDialog';
import { CreateDependsOnDialog } from './CreateDependsOnDialog';
import type { DependsOnConnection } from './depends-on-connection';
import { resolveDependsOnConnection } from './resolve-depends-on-connection';
import {
  getDiagramContextMenuItems,
  type DiagramContextAction,
} from './diagram-context-menu.config';
import { runPaneDiagramMenuAction } from './diagram-menu-action';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramContextMenu } from './DiagramContextMenu';
import { getLegend } from './get-legend';
import Legend from './Legend';
import { getLayoutedElements } from './layout-diagram';
import type { LayoutDirection } from './layout-direction';
import { layoutFeatureVersionDiagram } from './layout-feature-version-diagram';
import { buildFeatureVersionCompositionTable } from './build-feature-version-composition-table';
import { FeatureVersionCompositionTable } from './FeatureVersionCompositionTable';
import { featureVersionTableRowActions } from './feature-version-table-row-actions';
import { layoutFeatureVersionCompareDiagram } from './layout-feature-version-compare-diagram';
import { layoutVisibleDiagram } from './layout-visible-diagram';
import { diffFeatureVersionCompareSets } from './diff-feature-version-compare-sets';
import type { FeatureVersionCompareDiff } from './diff-feature-version-compare-sets';
import { extractFeatureVersionCompareSets } from './extract-feature-version-compare-sets';
import { mergeArchitectureGraphs } from './merge-architecture-graphs';
import { projectFeatureVersionFlatDiagram } from './project-feature-version-flat-diagram';
import { filterNodeMenuForFeatureVersionCompare } from './filter-node-menu-for-feature-version-compare';
import { layoutUnitDiagram } from './layout-unit-diagram';
import { resolveSourceNodeId } from './resolve-source-node-id';
import { resolveConnectionSourceIds } from './resolve-connection-source-ids';
import { toSourceIdNodes } from './to-source-id-nodes';
import { useLatestRequestGuard } from '../../hooks/useLatestRequestGuard';
import { viewNodeFromSelectedVersion } from './view-node-from-selected-version';
import {
  parseImpactAnalysisResult,
  type ArchitectureGraph,
  type ImpactQueryMode,
  ImpactQueryMode as ImpactQueryModeConst,
  type ViewEdge,
  type ViewNode,
} from '@stellode/models';
import {
  applyServiceAggregationDiagramView,
  inferDiagramImpactMode,
  markDependsOnAnomalies,
} from './diagram-production-overlays';
import {
  applicationVersionOnlyMergeConfig,
  overviewVersionMergeConfig,
  mergeVersionNodes,
} from './merge-version-nodes';
import { mergeTeamDiagramNodes } from './merge-team-diagram-nodes';
import { isOverviewDiagramEntity } from './overview-diagram-entity';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';
import { filterUnitCurrentComposition } from './filter-unit-current-composition';
import { projectUnitOverviewDiagram } from './project-unit-overview-diagram';
import { buildNodeContextMenuItems } from './node-context-menu-items';
import { isFlatFeatureVersionComponentNode } from './is-flat-feature-version-component-node';
import { collectImpactHighlightIds } from './collect-impact-highlight-ids';
import { collectHoverPathIds } from './collect-hover-path-ids';
import { applyHoverPathHighlight } from './apply-hover-path-highlight';
import { resolveImpactHttpTarget } from './resolve-impact-api-target';
import { resolveOpenInListTarget } from './resolve-open-in-list-target';
import { AddFeatureToServiceDialog } from './AddFeatureToServiceDialog';
import { RemoveFeatureFromServiceDialog } from './RemoveFeatureFromServiceDialog';
import { DiagramScopeTabs } from './DiagramScopeTabs';
import { buildDiagramApiPath } from './build-diagram-api-path';
import { resolveSpaDiagramRoute } from './resolve-spa-diagram-route';
import { ServiceProjectionToggle, ServiceScopeTabs } from './ServiceScopeTabs';
import { buildDiagramPageHeading } from './build-diagram-entity-heading';
import { appendFeatureVersionCompareHeading } from './append-feature-version-compare-heading';
import { isServiceArchived, isServiceDiagramEntity } from './service-diagram-entity';
import {
  defaultUnitDiagramVisibility,
  type UnitDiagramNodeKind,
} from './unit-diagram-type-visibility';
import { collectUnitDiagramFilterItems } from './collect-unit-diagram-filter-items';
import { emptyUnitDiagramInstanceFilter } from './empty-unit-diagram-instance-filter';
import type {
  UnitDiagramFilterCatalog,
  UnitDiagramInstanceFilter,
} from './unit-diagram-instance-filter-types';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';
import { UnitDiagramInstanceFilters } from './UnitDiagramInstanceFilters';
import { clearFeatureDraftVersionFields } from './clear-feature-draft-version-fields';
import { hideTeamDiagramAnchor } from './hide-team-diagram-anchor';
import { applyTeamDiagramCodeOnlyVisibility } from './apply-team-diagram-code-only-visibility';
import { FeatureVersionDiagramLegend } from './FeatureVersionDiagramLegend';
import { TeamDiagramLegend } from './TeamDiagramLegend';
import type { FeatureVersionLegendRow } from './feature-version-legend-row';
import { parentFeatureElementIdFromGraph } from './parent-feature-element-id-from-graph';
import { featureDiagramUnitIdFromGraph } from './feature-diagram-unit-id-from-graph';
import {
  applyComponentDiagramVisibility,
  componentDiagramLegendToggleOrder,
} from './component-diagram-type-visibility';
import { filterPaneMenuItemsForFeatureVersionReadOnly } from './filter-pane-menu-for-feature-version-read-only';
import { featureVersionDiagramIsReadOnly } from './feature-version-diagram-is-read-only';
import { CrossUnitDependsOnDialog } from './CrossUnitDependsOnDialog';
import { buildBindFeatureComponentVersionsAddBody } from './build-bind-feature-component-versions-add-body';
import { buildRaiseFeatureComponentVersionBody } from './build-raise-feature-component-version-body';
import { filterRaiseComponentVersionCandidates } from './filter-raise-component-version-candidates';
import { DiagramLegendShell } from './DiagramLegendShell';
import type { RaiseComponentVersionCandidate } from './filter-raise-component-version-candidates';
import { parseComponentVersionListRows } from './parse-component-version-list-rows';
import { RaiseComponentVersionDialog } from './RaiseComponentVersionDialog';
import { resolveComponentIdForVersion } from './resolve-component-id-for-version';
import { shouldBindComponentToFeatureVersion } from './should-bind-component-to-feature-version';
import { shouldResetFeatureVersionDiagramFilters } from './should-reset-feature-version-diagram-filters';
import './Diagrams.css';

const emptyUnitFilterCatalog = (): UnitDiagramFilterCatalog => ({
  [UnitDiagramFilterKind.Team]: [],
  [UnitDiagramFilterKind.Component]: [],
  [UnitDiagramFilterKind.Service]: [],
  [UnitDiagramFilterKind.Feature]: [],
  [UnitDiagramFilterKind.App]: [],
});


type UnitVisibilityState = Record<UnitDiagramNodeKind, boolean>;

type FlatDiagram = { nodes: ViewNode[]; edges: ViewEdge[] };

type ApplyVisibility = (
  nodes: ViewNode[],
  edges: ViewEdge[],
  visibility: UnitVisibilityState,
) => FlatDiagram;

const layoutVisibleSubset = (
  applyVisibility: ApplyVisibility,
  base: FlatDiagram,
  visibility: UnitVisibilityState,
  direction: LayoutDirection,
): Promise<FlatDiagram> => {
  const marked = applyVisibility(base.nodes, base.edges, visibility);
  return layoutVisibleDiagram(marked.nodes, marked.edges, direction);
};

type NodeContextMenuState = {
  x: number;
  y: number;
  nodeId: string;
  applicationId?: string;
  isFlatComponent?: boolean;
};

type EdgeContextMenuState = {
  x: number;
  y: number;
  edgeId: string;
  relationshipType: string;
  sourceComponentVersionId: string;
  targetComponentVersionId: string;
  consumerApplicationId?: string;
  providerApplicationId?: string;
  edgeLabel: string;
};

const withImpactFlags = (nodes: ViewNode[], ids: Set<string> | null): ViewNode[] =>
  nodes.map((n) => ({
    ...n,
    data: { ...n.data, impactHighlighted: ids?.has(resolveSourceNodeId(n)) ?? false },
  }));

export function Diagrams() {
  const title = 'Диаграммы';
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const spaRoute = resolveSpaDiagramRoute(location.pathname);
  const entity = spaRoute?.entity;
  const diagramAnchorId = spaRoute?.id;
  const { unit } = useUnit();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [diagramFitGeneration, setDiagramFitGeneration] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState<ViewNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ViewEdge>([]);
  const [meta, setMeta] = useState<ReturnType<typeof getLegend> | null>(null);
  const [archGraph, setArchGraph] = useState<ArchitectureGraph | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenuState | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<EdgeContextMenuState | null>(null);
  const beginLayoutRequest = useLatestRequestGuard();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addComponentOpen, setAddComponentOpen] = useState(false);
  const [dependsOnConnection, setDependsOnConnection] = useState<DependsOnConnection | null>(null);
  const [impactHighlightIds, setImpactHighlightIds] = useState<Set<string> | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [unitInstanceFilter, setUnitInstanceFilter] = useState<UnitDiagramInstanceFilter>(
    emptyUnitDiagramInstanceFilter,
  );
  const unitInstanceFilterRef = useRef(unitInstanceFilter);
  unitInstanceFilterRef.current = unitInstanceFilter;
  const [unitFilterCatalog, setUnitFilterCatalog] =
    useState<UnitDiagramFilterCatalog>(emptyUnitFilterCatalog);
  const unitDiagramBaseRef = useRef<FlatDiagram | null>(null);
  const unitLayoutDirectionRef = useRef<LayoutDirection>('LR');
  const lastUnitHubAnchorRef = useRef<string>('');
  const teamDiagramBaseRef = useRef<FlatDiagram | null>(null);
  const teamLayoutDirectionRef = useRef<LayoutDirection>('LR');
  const lastTeamHubAnchorRef = useRef<string>('');
  const [teamCodeOnly, setTeamCodeOnly] = useState(false);
  const teamCodeOnlyRef = useRef(teamCodeOnly);
  teamCodeOnlyRef.current = teamCodeOnly;
  const [componentNodeVisibility, setComponentNodeVisibility] = useState(defaultUnitDiagramVisibility);
  const componentNodeVisibilityRef = useRef(componentNodeVisibility);
  componentNodeVisibilityRef.current = componentNodeVisibility;
  const componentDiagramBaseRef = useRef<FlatDiagram | null>(null);
  const componentLayoutDirectionRef = useRef<LayoutDirection>('LR');
  const lastComponentHubAnchorRef = useRef<string>('');
  const featureVersionDiagramBaseRef = useRef<FlatDiagram | null>(null);
  const featureVersionLayoutDirectionRef = useRef<LayoutDirection>('LR');
  const lastFeatureVersionHubAnchorRef = useRef<string>('');
  const canvasLayoutDirectionRef = useRef<LayoutDirection>('LR');
  const [featureVersionTeamsVisible, setFeatureVersionTeamsVisible] = useState(true);
  const [featureVersionTableView, setFeatureVersionTableView] = useState(false);
  const featureVersionTeamsVisibleRef = useRef(featureVersionTeamsVisible);
  featureVersionTeamsVisibleRef.current = featureVersionTeamsVisible;
  const [featureVersionCrossUnitLinksVisible, setFeatureVersionCrossUnitLinksVisible] =
    useState(false);
  const featureVersionCrossUnitLinksVisibleRef = useRef(featureVersionCrossUnitLinksVisible);
  featureVersionCrossUnitLinksVisibleRef.current = featureVersionCrossUnitLinksVisible;
  const [featureVersionCompareEnabled, setFeatureVersionCompareEnabled] = useState(false);
  const featureVersionCompareEnabledRef = useRef(false);
  featureVersionCompareEnabledRef.current = featureVersionCompareEnabled;
  const featureVersionCompareDiffRef = useRef<FeatureVersionCompareDiff | null>(null);
  const [addFeatureToServiceOpen, setAddFeatureToServiceOpen] = useState(false);
  const [removeFeatureTarget, setRemoveFeatureTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [crossUnitDependsTarget, setCrossUnitDependsTarget] = useState<{
    componentVersionId: string;
    applicationId: string;
  } | null>(null);
  const [excludeFromFeatureTarget, setExcludeFromFeatureTarget] = useState<{
    componentVersionId: string;
    applicationId: string;
    label: string;
  } | null>(null);
  const [deleteDependsOnTarget, setDeleteDependsOnTarget] = useState<{
    sourceComponentVersionId: string;
    targetComponentVersionId: string;
    consumerApplicationId: string;
    providerApplicationId: string;
    edgeLabel: string;
  } | null>(null);
  const [raiseComponentTarget, setRaiseComponentTarget] = useState<{
    componentVersionId: string;
    applicationId: string;
    label: string;
    candidates: readonly RaiseComponentVersionCandidate[];
  } | null>(null);
  const [featureDependsOn, setFeatureDependsOn] = useState<{
    consumerCvId: string;
    consumerApplicationId: string;
    consumerLabel: string;
    providerOptions: readonly FeatureVersionUsesCvOption[];
    fixedProviderCvId?: string;
    fixedProviderApplicationId?: string;
    fixedProviderLabel?: string;
  } | null>(null);
  const [featureVersionsForLegend, setFeatureVersionsForLegend] = useState<
    FeatureVersionLegendRow[]
  >([]);
  const contextMenuPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reactFlowInstance = useRef<ReactFlowInstance<ViewNode, ViewEdge> | null>(null);
  const lastImpactModeRef = useRef<ImpactQueryMode>(ImpactQueryModeConst.Draft);
  const effectiveDiagramUnitId =
    entity === 'unit' && diagramAnchorId ? diagramAnchorId : unit?.id;

  const propertyDialogsUnitId = useMemo(
    () =>
      featureDiagramUnitIdFromGraph(archGraph, entity, diagramAnchorId) ??
      effectiveDiagramUnitId,
    [archGraph, entity, diagramAnchorId, effectiveDiagramUnitId],
  );

  const crossUnitExcludeHomeUnitIds = useMemo((): readonly string[] => {
    const tid = featureDiagramUnitIdFromGraph(archGraph, entity, diagramAnchorId);
    return tid ? [tid] : [];
  }, [archGraph, entity, diagramAnchorId]);

  const pushLayoutFromBase = useCallback(
    async (
      applyVisibility: ApplyVisibility,
      base: FlatDiagram | null,
      visibility: UnitVisibilityState,
      direction: LayoutDirection,
    ) => {
      if (base === null) return;
      const isLatest = beginLayoutRequest();
      const laid = await layoutVisibleSubset(applyVisibility, base, visibility, direction);
      if (!isLatest()) return;
      setNodes(withImpactFlags(laid.nodes, impactHighlightIds));
      setEdges(laid.edges);
    },
    [beginLayoutRequest, impactHighlightIds, setNodes, setEdges],
  );

  const pushUnitDiagramFromBase = useCallback(async () => {
    const base = unitDiagramBaseRef.current;
    if (base === null) return;
    const isLatest = beginLayoutRequest();
    const laid = await layoutUnitDiagram(
      base.nodes,
      base.edges,
      unitInstanceFilterRef.current,
      unitLayoutDirectionRef.current,
    );
    if (!isLatest()) return;
    setNodes(withImpactFlags(laid.nodes, impactHighlightIds));
    setEdges(laid.edges);
  }, [beginLayoutRequest, impactHighlightIds, setNodes, setEdges]);

  const pushTeamDiagramFromBase = useCallback(async () => {
    const base = teamDiagramBaseRef.current;
    if (base === null) return;
    const isLatest = beginLayoutRequest();
    const marked = hideTeamDiagramAnchor(base.nodes, base.edges);
    const filtered = applyTeamDiagramCodeOnlyVisibility(
      marked.nodes,
      marked.edges,
      teamCodeOnlyRef.current,
    );
    const laid = await layoutVisibleDiagram(
      filtered.nodes,
      filtered.edges,
      teamLayoutDirectionRef.current,
    );
    if (!isLatest()) return;
    setNodes(withImpactFlags(laid.nodes, impactHighlightIds));
    setEdges(laid.edges);
  }, [beginLayoutRequest, impactHighlightIds, setNodes, setEdges]);

  const pushComponentDiagramFromBase = useCallback(
    () =>
      pushLayoutFromBase(
        applyComponentDiagramVisibility,
        componentDiagramBaseRef.current,
        componentNodeVisibilityRef.current,
        componentLayoutDirectionRef.current,
      ),
    [pushLayoutFromBase],
  );

  const pushFeatureVersionDiagramFromBase = useCallback(async () => {
    const base = featureVersionDiagramBaseRef.current;
    if (base === null) return;
    const isLatest = beginLayoutRequest();
    const compareDiff = featureVersionCompareDiffRef.current;
    const laid =
      compareDiff !== null
        ? await layoutFeatureVersionCompareDiagram(
            base.nodes,
            base.edges,
            featureVersionLayoutDirectionRef.current,
            compareDiff,
            featureVersionTeamsVisibleRef.current,
            featureVersionCrossUnitLinksVisibleRef.current,
            featureVersionLayoutIdsRef.current,
          )
        : await layoutFeatureVersionDiagram(
            base.nodes,
            base.edges,
            featureVersionLayoutDirectionRef.current,
            featureVersionTeamsVisibleRef.current,
            featureVersionCrossUnitLinksVisibleRef.current,
            featureVersionLayoutIdsRef.current,
          );
    if (!isLatest()) return;
    setNodes(
      withImpactFlags(
        laid.nodes,
        featureVersionCompareEnabledRef.current ? null : impactHighlightIds,
      ),
    );
    setEdges(laid.edges);
  }, [beginLayoutRequest, impactHighlightIds, setNodes, setEdges]);

  const isFeatureVersionDiagramReadOnly = useMemo(
    () =>
      featureVersionDiagramIsReadOnly(entity, diagramAnchorId, archGraph) ||
      featureVersionCompareEnabled,
    [entity, diagramAnchorId, archGraph, featureVersionCompareEnabled],
  );

  const menuItems = useMemo(() => {
    let items = getDiagramContextMenuItems(
      isServiceDiagramEntity(entity) ? 'service' : entity,
    );
    if (
      isServiceDiagramEntity(entity) &&
      isServiceArchived(archGraph, diagramAnchorId)
    ) {
      items = items.filter((item) => item.action !== 'serviceAddFeature');
    }
    return filterPaneMenuItemsForFeatureVersionReadOnly(items, isFeatureVersionDiagramReadOnly);
  }, [entity, archGraph, diagramAnchorId, isFeatureVersionDiagramReadOnly]);

  const nodeMenuItems = useMemo(() => {
    if (!nodeContextMenu || !archGraph) return [];
    const items = buildNodeContextMenuItems({
      graph: archGraph,
      entity,
      diagramAnchorId,
      nodeId: nodeContextMenu.nodeId,
      currentUnitId: unit?.id,
      isFlatComponent: nodeContextMenu.isFlatComponent === true,
    });
    return filterNodeMenuForFeatureVersionCompare(items, featureVersionCompareEnabled);
  }, [
    nodeContextMenu,
    archGraph,
    entity,
    diagramAnchorId,
    featureVersionCompareEnabled,
    unit?.id,
  ]);

  const edgeMenuItems = useMemo(() => {
    if (!edgeContextMenu) return [];
    return buildEdgeContextMenuItems({
      entity,
      relationshipType: edgeContextMenu.relationshipType,
      isReadOnly: isFeatureVersionDiagramReadOnly,
    });
  }, [edgeContextMenu, entity, isFeatureVersionDiagramReadOnly]);

  const showFeatureVersionCheckReady = useMemo(() => {
    if (featureVersionCompareEnabled) return false;
    if (entity !== 'feature-version' || !diagramAnchorId || !archGraph) return false;
    const anchor = archGraph.nodes.find((n) => n.id === diagramAnchorId);
    return (
      anchor !== undefined &&
      anchor.labels.includes('FeatureVersion') &&
      anchor.status === 'draft'
    );
  }, [entity, diagramAnchorId, archGraph, featureVersionCompareEnabled]);

  const featureElementIdForLegend = useMemo((): string | null => {
    if (!diagramAnchorId || entity !== 'feature-version' || !archGraph) return null;
    return parentFeatureElementIdFromGraph(archGraph, diagramAnchorId);
  }, [entity, diagramAnchorId, archGraph]);

  const sortedFeatureLegendRows = useMemo(() => {
    const statusRank = (status: string): number => {
      if (status === 'draft') return 0;
      if (status === 'active') return 1;
      if (status === 'deprecated') return 2;
      return 3;
    };
    return [...featureVersionsForLegend].sort((left, right) => {
      const byStatus = statusRank(left.status) - statusRank(right.status);
      if (byStatus !== 0) return byStatus;
      return (right.versionNumber ?? 0) - (left.versionNumber ?? 0);
    });
  }, [featureVersionsForLegend]);

  const featureVersionCompareInheritedFromId = useMemo((): string | null => {
    if (!diagramAnchorId) return null;
    const row = featureVersionsForLegend.find((item) => item.id === diagramAnchorId);
    const inherited = row?.inheritedFromId;
    return typeof inherited === 'string' && inherited !== '' ? inherited : null;
  }, [diagramAnchorId, featureVersionsForLegend]);
  const featureVersionCompareInheritedFromIdRef = useRef(featureVersionCompareInheritedFromId);
  featureVersionCompareInheritedFromIdRef.current = featureVersionCompareInheritedFromId;
  const featureVersionLayoutIdsRef = useRef<readonly string[]>([]);
  featureVersionLayoutIdsRef.current = [
    diagramAnchorId,
    featureVersionCompareInheritedFromId,
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);

  const featureVersionCompareAvailable = featureVersionCompareInheritedFromId !== null;

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

  const loadDiagrams = useCallback(async () => {
    setImpactHighlightIds(null);
    setHoveredNodeId(null);
    unitDiagramBaseRef.current = null;
    teamDiagramBaseRef.current = null;
    componentDiagramBaseRef.current = null;
    featureVersionDiagramBaseRef.current = null;
    if (entity !== 'unit') {
      lastUnitHubAnchorRef.current = '';
    } else if (diagramAnchorId && diagramAnchorId !== lastUnitHubAnchorRef.current) {
      lastUnitHubAnchorRef.current = diagramAnchorId;
      const fresh = emptyUnitDiagramInstanceFilter();
      unitInstanceFilterRef.current = fresh;
      setUnitInstanceFilter(fresh);
      setUnitFilterCatalog(emptyUnitFilterCatalog());
    }
    if (entity !== 'team') {
      lastTeamHubAnchorRef.current = '';
    } else if (diagramAnchorId && diagramAnchorId !== lastTeamHubAnchorRef.current) {
      lastTeamHubAnchorRef.current = diagramAnchorId;
      teamCodeOnlyRef.current = false;
      setTeamCodeOnly(false);
    }
    if (entity !== 'component') {
      lastComponentHubAnchorRef.current = '';
    } else if (diagramAnchorId && diagramAnchorId !== lastComponentHubAnchorRef.current) {
      lastComponentHubAnchorRef.current = diagramAnchorId;
      const freshComponent = { ...defaultUnitDiagramVisibility };
      componentNodeVisibilityRef.current = freshComponent;
      setComponentNodeVisibility(freshComponent);
    }
    if (entity !== 'feature-version') {
      lastFeatureVersionHubAnchorRef.current = '';
      featureVersionTeamsVisibleRef.current = true;
      setFeatureVersionTeamsVisible(true);
      setFeatureVersionTableView(false);
      featureVersionCrossUnitLinksVisibleRef.current = false;
      setFeatureVersionCrossUnitLinksVisible(false);
      featureVersionCompareEnabledRef.current = false;
      featureVersionCompareDiffRef.current = null;
      setFeatureVersionCompareEnabled(false);
    } else if (diagramAnchorId && diagramAnchorId !== lastFeatureVersionHubAnchorRef.current) {
      const resetFilters = shouldResetFeatureVersionDiagramFilters(
        lastFeatureVersionHubAnchorRef.current,
      );
      lastFeatureVersionHubAnchorRef.current = diagramAnchorId;
      if (resetFilters) {
        featureVersionTeamsVisibleRef.current = true;
        setFeatureVersionTeamsVisible(true);
        featureVersionCrossUnitLinksVisibleRef.current = false;
        setFeatureVersionCrossUnitLinksVisible(false);
        featureVersionCompareEnabledRef.current = false;
        featureVersionCompareDiffRef.current = null;
        setFeatureVersionCompareEnabled(false);
      }
    }
    try {
      const serviceProjection =
        isServiceDiagramEntity(entity) && searchParams.get('projection') === 'draft'
          ? 'draft'
          : 'on-prod';
      if (!entity || !diagramAnchorId) return;
      const diagramApiPath = buildDiagramApiPath(
        entity,
        diagramAnchorId,
        serviceProjection,
      );
      const isLatest = beginLayoutRequest();
      const raw = await diagramsApi.get(diagramApiPath);
      if (!isLatest()) return;
      setArchGraph(raw);
      const diagram = architectureGraphToDiagram(raw);
      const mode = inferDiagramImpactMode(
        raw,
        entity,
        diagramAnchorId,
        serviceProjection,
      );
      lastImpactModeRef.current = mode;
      const taggedEdges = markDependsOnAnomalies(raw, mode, diagram.edges);
      const projected =
        entity === 'unit'
          ? projectUnitOverviewDiagram(diagram.nodes, taggedEdges)
          : entity === 'feature-version' ||
              entity === 'component' ||
              isOverviewDiagramEntity(entity, location.pathname)
            ? projectComponentVersionsToComponents(diagram.nodes, taggedEdges, {
                ...(entity === 'component' && diagramAnchorId
                  ? { keepComponentIds: [diagramAnchorId] }
                  : {}),
              })
            : { nodes: diagram.nodes, edges: taggedEdges };
      const unitProjected =
        entity === 'unit'
          ? filterUnitCurrentComposition(projected.nodes, projected.edges)
          : projected;
      const merged =
        entity === 'unit'
          ? mergeVersionNodes(unitProjected.nodes, unitProjected.edges, overviewVersionMergeConfig)
          : entity === 'feature-version' || entity === 'component'
            ? mergeVersionNodes(projected.nodes, projected.edges, applicationVersionOnlyMergeConfig)
            : isOverviewDiagramEntity(entity, location.pathname)
              ? entity === 'team'
                ? mergeTeamDiagramNodes(projected.nodes, projected.edges)
                : mergeVersionNodes(projected.nodes, projected.edges, overviewVersionMergeConfig)
              : projected;
      const svcView = applyServiceAggregationDiagramView(
        raw,
        entity,
        mode,
        diagramAnchorId,
        merged.nodes,
        merged.edges,
      );
      const withStyle = svcView.edges.map((e) =>
        e.diagramAnomaly
          ? { ...e, style: { stroke: '#c0392b', strokeWidth: 2.5 } }
          : e,
      );
      const canvasNodes =
        entity === 'team' ? clearFeatureDraftVersionFields(svcView.nodes) : svcView.nodes;
      const flat: FlatDiagram = { nodes: withImpactFlags(canvasNodes, null), edges: withStyle };
      unitDiagramBaseRef.current = entity === 'unit' ? flat : null;
      teamDiagramBaseRef.current = entity === 'team' ? flat : null;
      componentDiagramBaseRef.current = entity === 'component' ? flat : null;
      featureVersionDiagramBaseRef.current = entity === 'feature-version' ? flat : null;
      if (entity === 'unit') {
        setUnitFilterCatalog(collectUnitDiagramFilterItems(flat.nodes));
      }
      const teamAnchorHidden =
        entity === 'team' ? hideTeamDiagramAnchor(flat.nodes, flat.edges) : null;
      const filteredBase =
        entity === 'team' && teamAnchorHidden !== null
          ? applyTeamDiagramCodeOnlyVisibility(
              teamAnchorHidden.nodes,
              teamAnchorHidden.edges,
              teamCodeOnlyRef.current,
            )
          : entity === 'component'
            ? applyComponentDiagramVisibility(flat.nodes, flat.edges, componentNodeVisibilityRef.current)
            : flat;
      if (entity === 'unit') unitLayoutDirectionRef.current = 'LR';
      if (entity === 'team') teamLayoutDirectionRef.current = 'LR';
      if (entity === 'component') componentLayoutDirectionRef.current = 'LR';
      if (entity === 'feature-version') featureVersionLayoutDirectionRef.current = 'LR';
      canvasLayoutDirectionRef.current = 'LR';
      let featureVersionFlat = flat;
      let featureVersionCompareDiff: FeatureVersionCompareDiff | null = null;
      if (
        entity === 'feature-version' &&
        diagramAnchorId &&
        featureVersionCompareEnabledRef.current
      ) {
        const inheritedFromId = featureVersionCompareInheritedFromIdRef.current;
        if (inheritedFromId !== null) {
          const previousGraph = await diagramsApi.featureVersion(inheritedFromId);
          if (!isLatest()) return;
          featureVersionCompareDiff = diffFeatureVersionCompareSets(
            extractFeatureVersionCompareSets(raw),
            extractFeatureVersionCompareSets(previousGraph),
          );
          featureVersionCompareDiffRef.current = featureVersionCompareDiff;
          const mergedGraph = mergeArchitectureGraphs(raw, previousGraph);
          const mergedProjected = projectFeatureVersionFlatDiagram(
            mergedGraph,
            diagramAnchorId,
          );
          featureVersionFlat = {
            nodes: withImpactFlags(mergedProjected.nodes, null),
            edges: mergedProjected.edges.map((edge) =>
              edge.diagramAnomaly
                ? { ...edge, style: { stroke: '#c0392b', strokeWidth: 2.5 } }
                : edge,
            ),
          };
          featureVersionDiagramBaseRef.current = featureVersionFlat;
        } else {
          featureVersionCompareDiffRef.current = null;
          featureVersionCompareEnabledRef.current = false;
          setFeatureVersionCompareEnabled(false);
        }
      } else if (entity === 'feature-version') {
        featureVersionCompareDiffRef.current = null;
      }
      const laid =
        entity === 'unit'
          ? await layoutUnitDiagram(flat.nodes, flat.edges, unitInstanceFilterRef.current, 'LR')
          : entity === 'feature-version'
            ? featureVersionCompareDiff !== null
              ? await layoutFeatureVersionCompareDiagram(
                  featureVersionFlat.nodes,
                  featureVersionFlat.edges,
                  'LR',
                  featureVersionCompareDiff,
                  featureVersionTeamsVisibleRef.current,
                  featureVersionCrossUnitLinksVisibleRef.current,
                  featureVersionLayoutIdsRef.current,
                )
              : await layoutFeatureVersionDiagram(
                  featureVersionFlat.nodes,
                  featureVersionFlat.edges,
                  'LR',
                  featureVersionTeamsVisibleRef.current,
                  featureVersionCrossUnitLinksVisibleRef.current,
                  featureVersionLayoutIdsRef.current,
                )
            : await layoutVisibleDiagram(filteredBase.nodes, filteredBase.edges, 'LR');
      if (!isLatest()) return;
      setNodes(laid.nodes);
      setEdges(laid.edges);
      const hasTypeFilterLegend =
        entity === 'unit' || entity === 'component' || entity === 'feature-version';
      const legendSourceNodes =
        entity === 'team' && teamAnchorHidden !== null ? teamAnchorHidden.nodes : flat.nodes;
      setMeta(hasTypeFilterLegend ? null : getLegend(legendSourceNodes, unit?.id));
      setDiagramFitGeneration((value) => value + 1);
    } catch (err) {
      console.error('Error loading diagrams:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    }
  }, [
    location.pathname,
    searchParams,
    entity,
    diagramAnchorId,
    unit?.id,
    setNodes,
    setEdges,
    beginLayoutRequest,
    showToast,
  ]);

  useEffect(() => {
    void loadDiagrams();
  }, [loadDiagrams]);

  useEffect(() => {
    if (diagramFitGeneration === 0) return;
    const frame = requestAnimationFrame(() => {
      reactFlowInstance.current?.fitView({ padding: 0.15, duration: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [diagramFitGeneration]);

  useEffect(() => {
    if (entity !== 'unit' || !unitDiagramBaseRef.current) return;
    void pushUnitDiagramFromBase();
  }, [unitInstanceFilter, impactHighlightIds, entity, pushUnitDiagramFromBase]);

  useEffect(() => {
    if (entity !== 'team' || !teamDiagramBaseRef.current) return;
    void pushTeamDiagramFromBase();
  }, [teamCodeOnly, impactHighlightIds, entity, pushTeamDiagramFromBase]);

  useEffect(() => {
    if (entity !== 'component' || !componentDiagramBaseRef.current) return;
    void pushComponentDiagramFromBase();
  }, [componentNodeVisibility, impactHighlightIds, entity, pushComponentDiagramFromBase]);

  useEffect(() => {
    if (entity !== 'feature-version' || !featureVersionDiagramBaseRef.current) return;
    void pushFeatureVersionDiagramFromBase();
  }, [
    featureVersionTeamsVisible,
    featureVersionCrossUnitLinksVisible,
    impactHighlightIds,
    entity,
    pushFeatureVersionDiagramFromBase,
  ]);

  useEffect(() => {
    if (entity === 'unit' || entity === 'team') return;
    setNodes((prev) => withImpactFlags(prev, impactHighlightIds));
  }, [impactHighlightIds, entity, setNodes]);

  const onPaneContextMenu = useCallback(
    (e: { preventDefault: () => void; clientX: number; clientY: number }) => {
      e.preventDefault();
      setNodeContextMenu(null);
      setEdgeContextMenu(null);
      contextMenuPosition.current = { x: e.clientX, y: e.clientY };
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: ViewNode) => {
      e.preventDefault();
      setContextMenu(null);
      setEdgeContextMenu(null);
      setNodeContextMenu({
        x: e.clientX,
        y: e.clientY,
        nodeId: resolveSourceNodeId(node),
        ...(node.data.applicationId !== undefined
          ? { applicationId: node.data.applicationId }
          : {}),
        ...(entity === 'feature-version' && isFlatFeatureVersionComponentNode(node)
          ? { isFlatComponent: true }
          : {}),
      });
    },
    [entity],
  );

  const onEdgeContextMenu = useCallback(
    (e: ReactMouseEvent, edge: ViewEdge) => {
      e.preventDefault();
      setContextMenu(null);
      setNodeContextMenu(null);
      const sourceNode = nodes.find((node) => node.id === edge.source);
      const targetNode = nodes.find((node) => node.id === edge.target);
      const sourceCvId = sourceNode ? resolveSourceNodeId(sourceNode) : edge.source;
      const targetCvId = targetNode ? resolveSourceNodeId(targetNode) : edge.target;
      const apps = resolveEdgeDependsOnApps(edge, sourceNode, targetNode);
      const sourceLabel = sourceNode?.data.label ?? sourceCvId;
      const targetLabel = targetNode?.data.label ?? targetCvId;
      setEdgeContextMenu({
        x: e.clientX,
        y: e.clientY,
        edgeId: edge.id,
        relationshipType: edge.relationshipType,
        sourceComponentVersionId: sourceCvId,
        targetComponentVersionId: targetCvId,
        ...(apps.consumerApplicationId !== undefined
          ? { consumerApplicationId: apps.consumerApplicationId }
          : {}),
        ...(apps.providerApplicationId !== undefined
          ? { providerApplicationId: apps.providerApplicationId }
          : {}),
        edgeLabel: `${sourceLabel} → ${targetLabel}`,
      });
    },
    [nodes],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isFeatureVersionDiagramReadOnly) {
        return;
      }
      if (entity === 'feature-version') {
        const sourceNode = nodes.find((n) => n.id === params.source);
        const targetNode = nodes.find((n) => n.id === params.target);
        if (
          (sourceNode !== undefined && isFlatFeatureVersionComponentNode(sourceNode)) ||
          (targetNode !== undefined && isFlatFeatureVersionComponentNode(targetNode))
        ) {
          showToast('Нужна привязка к приложению', ToastVariant.Error);
          return;
        }
        const endpoints = resolveConnectionSourceIds(params, nodes);
        const sourceIdNodes = toSourceIdNodes(nodes);
        const dep = resolveDependsOnConnection(endpoints.source, endpoints.target, sourceIdNodes);
        const consumerId = dep?.consumerComponentVersionId;
        const providerId = dep?.providerComponentVersionId;
        if (
          dep &&
          consumerId !== null &&
          consumerId !== undefined &&
          providerId !== null &&
          providerId !== undefined &&
          diagramAnchorId
        ) {
          const consumerApp = sourceNode?.data.applicationId;
          const providerApp = targetNode?.data.applicationId;
          if (!consumerApp || !providerApp) {
            showToast('Нужна привязка к приложению', ToastVariant.Error);
            return;
          }
          const consumerFlow = nodes.find((n) => resolveSourceNodeId(n) === consumerId);
          const providerFlow = nodes.find((n) => resolveSourceNodeId(n) === providerId);
          setFeatureDependsOn({
            consumerCvId: consumerId,
            consumerApplicationId: consumerApp,
            consumerLabel: consumerFlow?.data.label ?? consumerId,
            providerOptions: collectFeatureVersionUsesCvOptions(nodes, consumerId),
            fixedProviderCvId: providerId,
            fixedProviderApplicationId: providerApp,
            fixedProviderLabel: providerFlow?.data.label ?? providerId,
          });
          return;
        }
        showToast(
          'Связь не поддерживается: используйте DEPENDS_ON между версиями компонентов',
          ToastVariant.Error,
        );
        return;
      }
      const endpoints = resolveConnectionSourceIds(params, nodes);
      const sourceIdNodes = toSourceIdNodes(nodes);
      const dep = resolveDependsOnConnection(endpoints.source, endpoints.target, sourceIdNodes);
      if (dep) {
        setDependsOnConnection(dep);
        return;
      }
      showToast(
        'Связь не поддерживается: используйте DEPENDS_ON между версиями компонентов',
        ToastVariant.Error,
      );
    },
    [nodes, showToast, entity, diagramAnchorId, isFeatureVersionDiagramReadOnly],
  );

  const getCanvasLayoutDirection = useCallback((): LayoutDirection => {
    if (entity === 'unit') return unitLayoutDirectionRef.current;
    if (entity === 'team') return teamLayoutDirectionRef.current;
    if (entity === 'component') return componentLayoutDirectionRef.current;
    if (entity === 'feature-version') return featureVersionLayoutDirectionRef.current;
    return canvasLayoutDirectionRef.current;
  }, [entity]);

  const onLayout = useCallback(
    async (direction: LayoutDirection = 'TB') => {
      if (entity === 'unit' && unitDiagramBaseRef.current) {
        unitLayoutDirectionRef.current = direction;
        await pushUnitDiagramFromBase();
        return;
      }
      if (entity === 'team' && teamDiagramBaseRef.current) {
        teamLayoutDirectionRef.current = direction;
        await pushTeamDiagramFromBase();
        return;
      }
      if (entity === 'component' && componentDiagramBaseRef.current) {
        componentLayoutDirectionRef.current = direction;
        await pushComponentDiagramFromBase();
        return;
      }
      if (entity === 'feature-version' && featureVersionDiagramBaseRef.current) {
        featureVersionLayoutDirectionRef.current = direction;
        await pushFeatureVersionDiagramFromBase();
        return;
      }
      canvasLayoutDirectionRef.current = direction;
      const isLatest = beginLayoutRequest();
      const laid = await getLayoutedElements(nodes, edges, direction);
      if (!isLatest()) return;
      setNodes(laid.nodes);
      setEdges(laid.edges);
    },
    [
      entity,
      nodes,
      edges,
      setNodes,
      setEdges,
      beginLayoutRequest,
      pushUnitDiagramFromBase,
      pushTeamDiagramFromBase,
      pushComponentDiagramFromBase,
      pushFeatureVersionDiagramFromBase,
    ],
  );

  const handleUnitInstanceFilterChange = useCallback((next: UnitDiagramInstanceFilter) => {
    unitInstanceFilterRef.current = next;
    setUnitInstanceFilter(next);
  }, []);

  const handleComponentTypeVisibilityChange = useCallback(
    (kind: UnitDiagramNodeKind, visible: boolean) => {
      setComponentNodeVisibility((prev) => ({ ...prev, [kind]: visible }));
    },
    [],
  );

  const handleFeatureVersionTeamsVisibleChange = useCallback((visible: boolean) => {
    featureVersionTeamsVisibleRef.current = visible;
    setFeatureVersionTeamsVisible(visible);
  }, []);

  const handleFeatureVersionCrossUnitLinksVisibleChange = useCallback((visible: boolean) => {
    featureVersionCrossUnitLinksVisibleRef.current = visible;
    setFeatureVersionCrossUnitLinksVisible(visible);
  }, []);

  const handleFeatureVersionCompareEnabledChange = useCallback(
    async (enabled: boolean) => {
      if (entity !== 'feature-version' || !diagramAnchorId || !archGraph) return;
      try {
        if (!enabled) {
          featureVersionCompareEnabledRef.current = false;
          featureVersionCompareDiffRef.current = null;
          setFeatureVersionCompareEnabled(false);
          const isLatest = beginLayoutRequest();
          const flatProjected = projectFeatureVersionFlatDiagram(archGraph, diagramAnchorId);
          const flat = {
            nodes: withImpactFlags(flatProjected.nodes, null),
            edges: flatProjected.edges,
          };
          featureVersionDiagramBaseRef.current = flat;
          const laid = await layoutFeatureVersionDiagram(
            flat.nodes,
            flat.edges,
            featureVersionLayoutDirectionRef.current,
            featureVersionTeamsVisibleRef.current,
            featureVersionCrossUnitLinksVisibleRef.current,
            featureVersionLayoutIdsRef.current,
          );
          if (!isLatest()) return;
          setNodes(laid.nodes);
          setEdges(laid.edges);
          return;
        }
        const inheritedFromId = featureVersionCompareInheritedFromIdRef.current;
        if (inheritedFromId === null) return;
        const previousGraph = await diagramsApi.featureVersion(inheritedFromId);
        const compareDiff = diffFeatureVersionCompareSets(
          extractFeatureVersionCompareSets(archGraph),
          extractFeatureVersionCompareSets(previousGraph),
        );
        const mergedGraph = mergeArchitectureGraphs(archGraph, previousGraph);
        const mergedProjected = projectFeatureVersionFlatDiagram(
          mergedGraph,
          diagramAnchorId,
        );
        const flat = {
          nodes: withImpactFlags(mergedProjected.nodes, null),
          edges: mergedProjected.edges,
        };
        featureVersionCompareDiffRef.current = compareDiff;
        featureVersionDiagramBaseRef.current = flat;
        const isLatest = beginLayoutRequest();
        const laid = await layoutFeatureVersionCompareDiagram(
          flat.nodes,
          flat.edges,
          featureVersionLayoutDirectionRef.current,
          compareDiff,
          featureVersionTeamsVisibleRef.current,
          featureVersionCrossUnitLinksVisibleRef.current,
          featureVersionLayoutIdsRef.current,
        );
        if (!isLatest()) return;
        featureVersionCompareEnabledRef.current = true;
        setFeatureVersionCompareEnabled(true);
        setNodes(withImpactFlags(laid.nodes, null));
        setEdges(laid.edges);
        setImpactHighlightIds((previous) => (previous === null ? previous : null));
      } catch (err) {
        featureVersionCompareEnabledRef.current = false;
        featureVersionCompareDiffRef.current = null;
        setFeatureVersionCompareEnabled(false);
        showToast(getErrorMessage(err), ToastVariant.Error);
      }
    },
    [
      entity,
      diagramAnchorId,
      archGraph,
      beginLayoutRequest,
      setNodes,
      setEdges,
      showToast,
    ],
  );

  const handleTeamCodeOnlyChange = useCallback((codeOnly: boolean) => {
    teamCodeOnlyRef.current = codeOnly;
    setTeamCodeOnly(codeOnly);
  }, []);

  const handleComponentCreated = useCallback(
    async (
      created?: {
        id?: string;
        draftComponentVersionId?: string;
        applicationId?: string;
      } | null,
    ) => {
      const featureVersionId = diagramAnchorId;
      const draftCvId = created?.draftComponentVersionId;
      const applicationId = created?.applicationId;
      if (
        shouldBindComponentToFeatureVersion(entity, featureVersionId) &&
        draftCvId &&
        applicationId &&
        featureVersionId
      ) {
        try {
          await featureVersionsApi.bindComponentVersions(
            buildBindFeatureComponentVersionsAddBody(featureVersionId, {
              componentVersionId: draftCvId,
              applicationId,
            }),
          );
          showToast('Компонент добавлен в состав фичи', ToastVariant.Success);
        } catch (err) {
          showToast(getErrorMessage(err), ToastVariant.Error);
        }
      }
      await loadDiagrams();
    },
    [diagramAnchorId, entity, loadDiagrams, showToast],
  );

  const handleComponentVersionSelected = useCallback(
    async (cv: SelectedVersion) => {
      const featureVersionId = diagramAnchorId;
      if (!shouldBindComponentToFeatureVersion(entity, featureVersionId)) {
        const position = reactFlowInstance.current?.screenToFlowPosition(
          contextMenuPosition.current,
        ) ?? { x: 100, y: 100 };
        setNodes((prev) => [...prev, viewNodeFromSelectedVersion(cv, position)]);
        return;
      }
      if (!cv.applicationId || !featureVersionId) {
        showToast('Нужно выбрать приложение для привязки', ToastVariant.Error);
        return;
      }
      try {
        await featureVersionsApi.bindComponentVersions(
          buildBindFeatureComponentVersionsAddBody(featureVersionId, {
            componentVersionId: cv.id,
            applicationId: cv.applicationId,
          }),
        );
        showToast('Компонент добавлен в состав фичи', ToastVariant.Success);
        await loadDiagrams();
      } catch (err) {
        showToast(getErrorMessage(err), ToastVariant.Error);
      }
    },
    [diagramAnchorId, entity, loadDiagrams, setNodes, showToast],
  );

  const handlePaneMenuAction = useCallback(
    (action: DiagramContextAction) => {
      if (
        isFeatureVersionDiagramReadOnly &&
        (action === 'createComponent' || action === 'addComponent')
      ) {
        return;
      }
      if (
        action === 'createComponent' ||
        action === 'addComponent' ||
        action === 'serviceAddFeature'
      ) {
        runPaneDiagramMenuAction(action, {
          closeMenu: () => setContextMenu(null),
          openCreateDialog: () => setCreateDialogOpen(true),
          openAddComponentDialog: () => setAddComponentOpen(true),
          openAddFeatureToServiceDialog: () => setAddFeatureToServiceOpen(true),
        });
      }
    },
    [isFeatureVersionDiagramReadOnly],
  );

  const handleEdgeMenuAction = useCallback(
    (action: DiagramContextAction) => {
      if (!edgeContextMenu) {
        setEdgeContextMenu(null);
        return;
      }
      const snapshot = edgeContextMenu;
      setEdgeContextMenu(null);
      if (action !== 'fvDeleteDependsOn' || isFeatureVersionDiagramReadOnly) return;
      if (!snapshot.consumerApplicationId || !snapshot.providerApplicationId) {
        showToast('Не удалось определить приложения связи', ToastVariant.Error);
        return;
      }
      setDeleteDependsOnTarget({
        sourceComponentVersionId: snapshot.sourceComponentVersionId,
        targetComponentVersionId: snapshot.targetComponentVersionId,
        consumerApplicationId: snapshot.consumerApplicationId,
        providerApplicationId: snapshot.providerApplicationId,
        edgeLabel: snapshot.edgeLabel,
      });
    },
    [edgeContextMenu, isFeatureVersionDiagramReadOnly, showToast],
  );

  const handleNodeMenuAction = useCallback(
    async (
      action: DiagramContextAction,
      override?: {
        nodeId: string;
        applicationId?: string;
        isFlatComponent?: boolean;
      },
    ) => {
      const menuState = override ?? nodeContextMenu;
      if (!menuState || !archGraph) {
        setNodeContextMenu(null);
        return;
      }
      const { nodeId, applicationId } = menuState;
      const menuSnapshot = menuState;
      setNodeContextMenu(null);
      if (action === 'openInList') {
        const path = resolveOpenInListTarget(archGraph, nodeId, unit?.id ?? '');
        if (path !== null) navigate(path);
        return;
      }
      if (
        isFeatureVersionDiagramReadOnly &&
        (action === 'crossUnitDependsOn' ||
          action === 'fvAddDependsOn' ||
          action === 'fvReplaceUses' ||
          action === 'fvRemoveUses')
      ) {
        return;
      }
      if (
        menuSnapshot.isFlatComponent === true &&
        (action === 'crossUnitDependsOn' ||
          action === 'fvAddDependsOn' ||
          action === 'fvReplaceUses' ||
          action === 'fvRemoveUses')
      ) {
        showToast('Нужна привязка к приложению', ToastVariant.Error);
        return;
      }
      if (action === 'showImpact') {
        const target = resolveImpactHttpTarget(archGraph, nodeId);
        if (!target) return;
        try {
          const data = await impactApi.bySegment(
            target.segment,
            target.resourceId,
            lastImpactModeRef.current,
          );
          const parsed = parseImpactAnalysisResult(data);
          if (!parsed) {
            setImpactHighlightIds(null);
            showToast('Некорректный ответ Impact API', ToastVariant.Error);
            return;
          }
          setImpactHighlightIds(collectImpactHighlightIds(parsed));
          showToast('Подсветка влияния на графе', ToastVariant.Success);
        } catch (err: unknown) {
          showToast(getErrorMessage(err), ToastVariant.Error);
        }
        return;
      }
      if (!diagramAnchorId) return;
      if (action === 'crossUnitDependsOn') {
        if (!applicationId) {
          showToast('Нужна привязка к приложению', ToastVariant.Error);
          return;
        }
        setCrossUnitDependsTarget({
          componentVersionId: nodeId,
          applicationId,
        });
        return;
      }
      if (action === 'fvAddDependsOn') {
        if (!applicationId) {
          showToast('Нужна привязка к приложению', ToastVariant.Error);
          return;
        }
        const canvasNode = nodes.find((node) => resolveSourceNodeId(node) === nodeId);
        const graphNode = archGraph.nodes.find((node) => node.id === nodeId);
        setFeatureDependsOn({
          consumerCvId: nodeId,
          consumerApplicationId: applicationId,
          consumerLabel: canvasNode?.data.label ?? graphNode?.name ?? nodeId,
          providerOptions: collectFeatureVersionUsesCvOptions(nodes, nodeId),
        });
        return;
      }
      if (action === 'fvRemoveUses') {
        if (!applicationId) {
          showToast('Нужна привязка к приложению', ToastVariant.Error);
          return;
        }
        const graphNode = archGraph.nodes.find((node) => node.id === nodeId);
        const canvasNode = nodes.find((node) => resolveSourceNodeId(node) === nodeId);
        setExcludeFromFeatureTarget({
          componentVersionId: nodeId,
          applicationId,
          label: canvasNode?.data.label ?? graphNode?.name ?? nodeId,
        });
        return;
      }
      if (action === 'fvReplaceUses') {
        if (!applicationId || !diagramAnchorId) {
          showToast('Нужна привязка к приложению', ToastVariant.Error);
          return;
        }
        const componentElementId = resolveComponentIdForVersion(archGraph, nodeId);
        const fromNode = archGraph.nodes.find((node) => node.id === nodeId);
        const fromVersionNumber = fromNode?.versionNumber;
        if (!componentElementId || fromVersionNumber === undefined) {
          showToast('Не удалось определить компонент для поднятия версии', ToastVariant.Error);
          return;
        }
        const graphNode = archGraph.nodes.find((node) => node.id === nodeId);
        const canvasNode = nodes.find((node) => resolveSourceNodeId(node) === nodeId);
        const label = canvasNode?.data.label ?? graphNode?.name ?? nodeId;
        try {
          const versionRows = await componentVersionsApi.list(componentElementId);
          const candidates = filterRaiseComponentVersionCandidates(
            parseComponentVersionListRows(versionRows),
            fromVersionNumber,
          );
          if (candidates.length >= 2) {
            setRaiseComponentTarget({
              componentVersionId: nodeId,
              applicationId,
              label,
              candidates,
            });
            return;
          }
          await featureVersionsApi.raiseComponentVersion(
            buildRaiseFeatureComponentVersionBody(
              diagramAnchorId,
              nodeId,
              applicationId,
              candidates[0]?.id,
            ),
          );
          showToast(
            'Версия компонента поднята. Проверьте зависимости при необходимости.',
            ToastVariant.Success,
          );
          await loadDiagrams();
        } catch (err: unknown) {
          showToast(getErrorMessage(err), ToastVariant.Error);
        }
        return;
      }
      if (action === 'serviceRemoveFeature') {
        const n = archGraph.nodes.find((node) => node.id === nodeId);
        setRemoveFeatureTarget({ id: nodeId, name: n?.name ?? nodeId });
        return;
      }
    },
    [
      nodeContextMenu,
      archGraph,
      diagramAnchorId,
      showToast,
      isFeatureVersionDiagramReadOnly,
      nodes,
      unit?.id,
      navigate,
      loadDiagrams,
    ],
  );

  const { checkReady, modalOpen, result, closeModal } = useFeatureVersionReadinessCheck(() => {
    void loadDiagrams();
  });

  const handleCheckFeatureVersionReady = useCallback(() => {
    if (!diagramAnchorId) return;
    void checkReady(diagramAnchorId);
  }, [diagramAnchorId, checkReady]);

  const pageHeading = useMemo(() => {
    const base = buildDiagramPageHeading({
      kind: 'entityRoute',
      entity,
      diagramAnchorId,
      archGraph,
      fallbackTitle: title,
    });
    if (
      entity !== 'feature-version' ||
      !featureVersionCompareEnabled ||
      featureVersionCompareInheritedFromId === null ||
      !diagramAnchorId ||
      !archGraph
    ) {
      return base;
    }
    const selected = sortedFeatureLegendRows.find((row) => row.id === diagramAnchorId);
    const previous = sortedFeatureLegendRows.find(
      (row) => row.id === featureVersionCompareInheritedFromId,
    );
    if (selected === undefined || previous === undefined) return base;
    const featureId = parentFeatureElementIdFromGraph(archGraph, diagramAnchorId);
    const featureNode =
      featureId === null
        ? undefined
        : archGraph.nodes.find((node) => node.id === featureId);
    const featureLabel = featureNode?.name ? `Фича ${featureNode.name}` : 'Фича';
    return appendFeatureVersionCompareHeading(
      featureLabel,
      { version: selected.version, status: selected.status },
      { version: previous.version, status: previous.status },
    );
  }, [
    entity,
    diagramAnchorId,
    archGraph,
    title,
    featureVersionCompareEnabled,
    featureVersionCompareInheritedFromId,
    sortedFeatureLegendRows,
  ]);

  const unitHoverPainted = useMemo(() => {
    if (entity !== 'unit') return null;
    const path = hoveredNodeId
      ? collectHoverPathIds(hoveredNodeId, nodes, edges, 'unit')
      : null;
    return applyHoverPathHighlight(nodes, edges, path);
  }, [entity, hoveredNodeId, nodes, edges]);

  const flowNodes = unitHoverPainted?.nodes ?? nodes;
  const flowEdges = useMemo(
    () => prepareDependsOnCanvasEdges(unitHoverPainted?.edges ?? edges),
    [unitHoverPainted?.edges, edges],
  );

  const featureVersionTable = useMemo(() => {
    if (entity !== 'feature-version') return null;
    const namesById = new Map<string, string>();
    for (const graphNode of archGraph?.nodes ?? []) {
      const label = graphNode.name.trim();
      if (label.length > 0) namesById.set(graphNode.id, label);
    }
    return buildFeatureVersionCompositionTable({
      nodes,
      edges,
      homeUnitId: propertyDialogsUnitId,
      crossUnitLinksVisible: featureVersionCrossUnitLinksVisible,
      namesById,
    });
  }, [
    entity,
    archGraph,
    nodes,
    edges,
    propertyDialogsUnitId,
    featureVersionCrossUnitLinksVisible,
  ]);

  const featureVersionTablePaneActions = useMemo(
    () =>
      menuItems.filter(
        (item) => item.action === 'createComponent' || item.action === 'addComponent',
      ),
    [menuItems],
  );

  const onUnitNodeMouseEnter = useCallback(
    (_event: ReactMouseEvent, node: ViewNode) => {
      if (entity !== 'unit') return;
      setHoveredNodeId(node.id);
    },
    [entity],
  );

  const onUnitNodeMouseLeave = useCallback(() => {
    if (entity !== 'unit') return;
    setHoveredNodeId(null);
  }, [entity]);

  return (
    <div className="diagram-page">
      <div className="diagram-page__header">
        <h1>{pageHeading}</h1>
      </div>

      <div className="content-diagram">
          <DiagramLegendShell>
            {entity === 'unit' && diagramAnchorId ? (
              <>
                <DiagramScopeTabs active="unit" unitId={diagramAnchorId} />
                <UnitDiagramInstanceFilters
                  catalog={unitFilterCatalog}
                  filter={unitInstanceFilter}
                  onFilterChange={handleUnitInstanceFilterChange}
                />
              </>
            ) : null}
            {entity === 'component' && diagramAnchorId ? (
              <Legend
                unitTypeVisibility={componentNodeVisibility}
                onUnitTypeVisibilityChange={handleComponentTypeVisibilityChange}
                unitTypeToggleKinds={componentDiagramLegendToggleOrder}
              />
            ) : null}
            {entity === 'feature-version' && diagramAnchorId ? (
              <FeatureVersionDiagramLegend
                rows={sortedFeatureLegendRows}
                anchorFeatureVersionId={diagramAnchorId}
                tableView={featureVersionTableView}
                onTableViewChange={(nextTableView) => {
                  if (nextTableView) {
                    featureVersionTeamsVisibleRef.current = true;
                    setFeatureVersionTeamsVisible(true);
                  }
                  setFeatureVersionTableView(nextTableView);
                }}
                teamsVisible={featureVersionTeamsVisible}
                onTeamsVisibleChange={handleFeatureVersionTeamsVisibleChange}
                crossUnitLinksVisible={featureVersionCrossUnitLinksVisible}
                onCrossUnitLinksVisibleChange={handleFeatureVersionCrossUnitLinksVisibleChange}
                compareEnabled={featureVersionCompareEnabled}
                compareAvailable={featureVersionCompareAvailable}
                teamsLocked={featureVersionTableView}
                onCompareEnabledChange={(enabled) => {
                  void handleFeatureVersionCompareEnabledChange(enabled);
                }}
              />
            ) : null}
            {entity === 'team' && diagramAnchorId && meta ? (
              <TeamDiagramLegend
                data={meta}
                codeOnly={teamCodeOnly}
                onCodeOnlyChange={handleTeamCodeOnlyChange}
              />
            ) : null}
            {isServiceDiagramEntity(entity) && diagramAnchorId ? (
              <>
                <ServiceScopeTabs
                  active={entity === 'service-integrations' ? 'integrations' : 'service'}
                  serviceId={diagramAnchorId}
                />
                <ServiceProjectionToggle />
                {meta ? <Legend data={meta} /> : null}
              </>
            ) : null}
            {entity !== 'unit' &&
            entity !== 'team' &&
            !isServiceDiagramEntity(entity) &&
            entity !== 'feature-version' &&
            entity !== 'component' &&
            meta ? (
              <Legend data={meta} />
            ) : null}
          </DiagramLegendShell>
          <div
            className={`diagram-container${
              entity === 'feature-version' && featureVersionTableView
                ? ' diagram-container--table'
                : ''
            }`}
          >
            {entity === 'feature-version' && featureVersionTableView && featureVersionTable ? (
              <FeatureVersionCompositionTable
                model={featureVersionTable}
                paneActions={featureVersionTablePaneActions}
                onPaneAction={handlePaneMenuAction}
                showCheckReady={showFeatureVersionCheckReady}
                onCheckReady={() => void handleCheckFeatureVersionReady()}
                actionsForRow={(row, composition) =>
                  featureVersionTableRowActions(
                    filterNodeMenuForFeatureVersionCompare(
                      buildNodeContextMenuItems({
                        graph: archGraph,
                        entity,
                        diagramAnchorId,
                        nodeId: row.componentVersionId,
                        currentUnitId: unit?.id,
                        isFlatComponent: row.flat,
                      }),
                      featureVersionCompareEnabled,
                    ),
                    composition,
                  )
                }
                onRowAction={(action, row) => {
                  void handleNodeMenuAction(action, {
                    nodeId: row.componentVersionId,
                    applicationId: row.applicationId,
                    isFlatComponent: row.flat,
                  });
                }}
              />
            ) : (
            <DiagramCanvas
              nodes={flowNodes}
              edges={flowEdges}
              nodesConnectable={!isFeatureVersionDiagramReadOnly}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneContextMenu={onPaneContextMenu}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
              onNodeMouseEnter={entity === 'unit' ? onUnitNodeMouseEnter : undefined}
              onNodeMouseLeave={entity === 'unit' ? onUnitNodeMouseLeave : undefined}
              onInit={(instance) => {
                reactFlowInstance.current = instance;
              }}
              onLayout={(direction) => void onLayout(direction)}
              mermaidNodes={nodes}
              mermaidEdges={edges}
              getMermaidDirection={getCanvasLayoutDirection}
              toolbarExtra={
                <>
                  {showFeatureVersionCheckReady ? (
                    <Button htmlType="button" onClick={() => void handleCheckFeatureVersionReady()}>
                      Проверить готовность
                    </Button>
                  ) : null}
                  {entity !== 'unit' &&
                  !featureVersionCompareEnabled &&
                  impactHighlightIds &&
                  impactHighlightIds.size > 0 ? (
                    <Button htmlType="button" onClick={() => setImpactHighlightIds(null)}>
                      Сбросить влияние
                    </Button>
                  ) : null}
                </>
              }
            />
            )}
            <DiagramContextMenu
              open={!!contextMenu}
              position={contextMenu}
              items={menuItems}
              onDismiss={() => setContextMenu(null)}
              onAction={handlePaneMenuAction}
            />
            <DiagramContextMenu
              open={!!nodeContextMenu}
              position={nodeContextMenu}
              items={nodeMenuItems}
              onDismiss={() => setNodeContextMenu(null)}
              onAction={(a) => {
                void handleNodeMenuAction(a);
              }}
            />
            <DiagramContextMenu
              open={!!edgeContextMenu && edgeMenuItems.length > 0}
              position={edgeContextMenu}
              items={edgeMenuItems}
              onDismiss={() => setEdgeContextMenu(null)}
              onAction={handleEdgeMenuAction}
            />
          </div>
        </div>

      <CrossUnitDependsOnDialog
        isOpen={crossUnitDependsTarget !== null}
        onClose={() => setCrossUnitDependsTarget(null)}
        excludeUnitIds={crossUnitExcludeHomeUnitIds}
        sourceComponentVersionId={crossUnitDependsTarget?.componentVersionId ?? null}
        consumerApplicationId={crossUnitDependsTarget?.applicationId ?? null}
        consumerFeatureVersionId={diagramAnchorId ?? null}
        onCompleted={loadDiagrams}
      />

      <ComponentCreateDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        unitId={propertyDialogsUnitId}
        requireApplicationBinding={shouldBindComponentToFeatureVersion(entity, diagramAnchorId)}
        onSuccess={handleComponentCreated}
      />

      <AddComponentDialog
        isOpen={addComponentOpen}
        onClose={() => setAddComponentOpen(false)}
        unitId={propertyDialogsUnitId}
        requireApplicationBinding={shouldBindComponentToFeatureVersion(entity, diagramAnchorId)}
        onSelect={(cv) => {
          void handleComponentVersionSelected(cv);
        }}
      />

      <CreateDependsOnDialog
        isOpen={dependsOnConnection !== null}
        onClose={() => setDependsOnConnection(null)}
        connection={dependsOnConnection}
        unitId={propertyDialogsUnitId}
        onSuccess={loadDiagrams}
      />

      <AddFeatureDependsOnDialog
        isOpen={featureDependsOn !== null}
        onClose={() => setFeatureDependsOn(null)}
        featureVersionId={diagramAnchorId}
        consumerCvId={featureDependsOn?.consumerCvId}
        consumerApplicationId={featureDependsOn?.consumerApplicationId}
        consumerLabel={featureDependsOn?.consumerLabel ?? ''}
        providerOptions={featureDependsOn?.providerOptions ?? []}
        {...(featureDependsOn?.fixedProviderCvId !== undefined
          ? {
              fixedProviderCvId: featureDependsOn.fixedProviderCvId,
              fixedProviderApplicationId: featureDependsOn.fixedProviderApplicationId,
              fixedProviderLabel: featureDependsOn.fixedProviderLabel,
            }
          : {})}
        onSuccess={loadDiagrams}
      />

      <ExcludeComponentFromFeatureDialog
        isOpen={excludeFromFeatureTarget !== null}
        onClose={() => setExcludeFromFeatureTarget(null)}
        featureVersionId={diagramAnchorId}
        componentVersionId={excludeFromFeatureTarget?.componentVersionId}
        applicationId={excludeFromFeatureTarget?.applicationId}
        componentLabel={excludeFromFeatureTarget?.label ?? ''}
        onSuccess={async () => {
          showToast('Компонент исключён из фичи', ToastVariant.Success);
          await loadDiagrams();
        }}
      />

      <DeleteFeatureDependsOnDialog
        isOpen={deleteDependsOnTarget !== null}
        onClose={() => setDeleteDependsOnTarget(null)}
        featureVersionId={diagramAnchorId}
        sourceComponentVersionId={deleteDependsOnTarget?.sourceComponentVersionId}
        targetComponentVersionId={deleteDependsOnTarget?.targetComponentVersionId}
        consumerApplicationId={deleteDependsOnTarget?.consumerApplicationId}
        providerApplicationId={deleteDependsOnTarget?.providerApplicationId}
        edgeLabel={deleteDependsOnTarget?.edgeLabel ?? ''}
        onSuccess={async () => {
          showToast('Связь DEPENDS_ON удалена', ToastVariant.Success);
          await loadDiagrams();
        }}
      />

      <RaiseComponentVersionDialog
        isOpen={raiseComponentTarget !== null}
        onClose={() => setRaiseComponentTarget(null)}
        featureVersionId={diagramAnchorId}
        fromComponentVersionId={raiseComponentTarget?.componentVersionId}
        applicationId={raiseComponentTarget?.applicationId}
        componentLabel={raiseComponentTarget?.label ?? ''}
        candidates={raiseComponentTarget?.candidates ?? []}
        onSuccess={async () => {
          showToast(
            'Версия компонента поднята. Проверьте зависимости при необходимости.',
            ToastVariant.Success,
          );
          await loadDiagrams();
        }}
      />

      <AddFeatureToServiceDialog
        isOpen={addFeatureToServiceOpen}
        onClose={() => setAddFeatureToServiceOpen(false)}
        unitId={propertyDialogsUnitId}
        serviceId={diagramAnchorId}
        onSuccess={() => {
          showToast('Фича добавлена в услугу', ToastVariant.Success);
          void loadDiagrams();
        }}
      />

      <RemoveFeatureFromServiceDialog
        isOpen={removeFeatureTarget !== null}
        onClose={() => setRemoveFeatureTarget(null)}
        serviceId={diagramAnchorId}
        featureId={removeFeatureTarget?.id}
        featureName={removeFeatureTarget?.name ?? ''}
        onSuccess={() => {
          showToast('Фича снята с услуги', ToastVariant.Success);
          void loadDiagrams();
        }}
      />

      <FeatureReadinessModal isOpen={modalOpen} result={result} onClose={closeModal} />
    </div>
  );
}
