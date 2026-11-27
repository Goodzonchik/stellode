import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import {
  useEdgesState,
  useNodesState,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
} from '@xyflow/react';
import {
  ImpactQueryMode as ImpactQueryModeConst,
  type ArchitectureGraph,
  type ImpactQueryMode,
  type ViewEdge,
  type ViewNode,
} from '@stellode/models';
import { diagramsApi } from '../../api/diagrams-api';
import { useLatestRequestGuard } from '../../hooks/useLatestRequestGuard';
import type { useToast } from '../../hooks/useToast';
import { ToastVariant } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/axios-error';
import { applyHoverPathHighlight } from './apply-hover-path-highlight';
import { applyTeamDiagramCodeOnlyVisibility } from './apply-team-diagram-code-only-visibility';
import { buildDiagramApiPath } from './build-diagram-api-path';
import {
  buildFeatureVersionCompareBase,
  buildFeatureVersionFlatBase,
} from './build-feature-version-compare-base';
import {
  buildFeatureVersionCompositionTable,
  type FeatureVersionCompositionTable,
} from './build-feature-version-composition-table';
import { collectHoverPathIds } from './collect-hover-path-ids';
import { collectUnitDiagramFilterItems } from './collect-unit-diagram-filter-items';
import { applyComponentDiagramVisibility } from './component-diagram-type-visibility';
import type { FeatureVersionCompareDiff } from './diff-feature-version-compare-sets';
import { featureDiagramUnitIdFromGraph } from './feature-diagram-unit-id-from-graph';
import type { FlatDiagram, UnitVisibilityState } from './flat-diagram';
import { getLegend, type Legend } from './get-legend';
import { hideTeamDiagramAnchor } from './hide-team-diagram-anchor';
import { getLayoutedElements } from './layout-diagram';
import type { LayoutDirection } from './layout-direction';
import { layoutFeatureVersionCompareDiagram } from './layout-feature-version-compare-diagram';
import { layoutFeatureVersionDiagram } from './layout-feature-version-diagram';
import { layoutUnitDiagram } from './layout-unit-diagram';
import { layoutVisibleDiagram } from './layout-visible-diagram';
import { layoutVisibleSubset } from './layout-visible-subset';
import { prepareDependsOnCanvasEdges } from './prepare-depends-on-canvas-edges';
import {
  projectLoadedDiagram,
  styleAnomalyEdges,
  type ServiceProjectionMode,
} from './project-loaded-diagram';
import { isServiceDiagramEntity } from './service-diagram-entity';
import type { UnitDiagramInstanceFilter } from './unit-diagram-instance-filter-types';
import type {
  ApplyFeatureVersionCompare,
  DiagramEntity,
  DiagramFilters,
} from './useDiagramFilters';
import { withImpactFlags } from './with-impact-flags';

export type ShowToast = ReturnType<typeof useToast>['showToast'];

export type ImpactHighlightIds = Set<string> | null;

export type DiagramFlowInstance = ReactFlowInstance<ViewNode, ViewEdge>;

export type UseDiagramLoadParams = {
  readonly entity: DiagramEntity;
  readonly diagramAnchorId: string | undefined;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly unitId: string | undefined;
  readonly showToast: ShowToast;
  readonly archGraph: ArchitectureGraph | null;
  readonly setArchGraph: (graph: ArchitectureGraph) => void;
  readonly filters: DiagramFilters;
};

export type DiagramLoad = {
  readonly nodes: ViewNode[];
  readonly edges: ViewEdge[];
  readonly setNodes: Dispatch<SetStateAction<ViewNode[]>>;
  readonly onNodesChange: OnNodesChange<ViewNode>;
  readonly onEdgesChange: OnEdgesChange<ViewEdge>;
  readonly flowNodes: ViewNode[];
  readonly flowEdges: ViewEdge[];
  readonly meta: Legend | null;
  readonly impactHighlightIds: ImpactHighlightIds;
  readonly setImpactHighlightIds: Dispatch<SetStateAction<ImpactHighlightIds>>;
  readonly lastImpactModeRef: RefObject<ImpactQueryMode>;
  readonly loadDiagrams: () => Promise<void>;
  readonly applyCompare: ApplyFeatureVersionCompare;
  readonly onLayout: (direction?: LayoutDirection) => Promise<void>;
  readonly getCanvasLayoutDirection: () => LayoutDirection;
  readonly reactFlowInstance: RefObject<DiagramFlowInstance | null>;
  readonly handleFlowInit: (instance: DiagramFlowInstance) => void;
  readonly onUnitNodeMouseEnter: (event: ReactMouseEvent, node: ViewNode) => void;
  readonly onUnitNodeMouseLeave: () => void;
  readonly propertyDialogsUnitId: string | undefined;
  readonly featureVersionTable: FeatureVersionCompositionTable | null;
};

type BasedEntity = 'unit' | 'team' | 'component' | 'feature-version';

const basedEntities: readonly BasedEntity[] = ['unit', 'team', 'component', 'feature-version'];

const isBasedEntity = (entity: DiagramEntity): entity is BasedEntity =>
  basedEntities.some((based) => based === entity);

type DiagramLayoutRefs = {
  readonly bases: Readonly<Record<BasedEntity, RefObject<FlatDiagram | null>>>;
  readonly directions: Readonly<Record<BasedEntity, RefObject<LayoutDirection>>>;
  readonly canvasDirection: RefObject<LayoutDirection>;
  readonly featureVersionCompareDiff: RefObject<FeatureVersionCompareDiff | null>;
};

const createLayoutRefs = (): DiagramLayoutRefs => ({
  bases: {
    unit: { current: null },
    team: { current: null },
    component: { current: null },
    'feature-version': { current: null },
  },
  directions: {
    unit: { current: 'LR' },
    team: { current: 'LR' },
    component: { current: 'LR' },
    'feature-version': { current: 'LR' },
  },
  canvasDirection: { current: 'LR' },
  featureVersionCompareDiff: { current: null },
});

type FeatureVersionLayoutOptions = {
  readonly compareDiff: FeatureVersionCompareDiff | null;
  readonly teamsVisible: boolean;
  readonly crossUnitLinksVisible: boolean;
  readonly layoutIds: readonly string[];
};

type BaseLayoutInputs = {
  readonly unitInstanceFilter: UnitDiagramInstanceFilter;
  readonly teamCodeOnly: boolean;
  readonly componentVisibility: UnitVisibilityState;
  readonly featureVersion: FeatureVersionLayoutOptions;
};

const layoutFeatureVersionBase = (
  base: FlatDiagram,
  direction: LayoutDirection,
  options: FeatureVersionLayoutOptions,
): Promise<FlatDiagram> =>
  options.compareDiff !== null
    ? layoutFeatureVersionCompareDiagram(
        base.nodes,
        base.edges,
        direction,
        options.compareDiff,
        options.teamsVisible,
        options.crossUnitLinksVisible,
        options.layoutIds,
      )
    : layoutFeatureVersionDiagram(
        base.nodes,
        base.edges,
        direction,
        options.teamsVisible,
        options.crossUnitLinksVisible,
        options.layoutIds,
      );

const layoutTeamBase = (
  base: FlatDiagram,
  direction: LayoutDirection,
  codeOnly: boolean,
): Promise<FlatDiagram> => {
  const marked = hideTeamDiagramAnchor(base.nodes, base.edges);
  const filtered = applyTeamDiagramCodeOnlyVisibility(marked.nodes, marked.edges, codeOnly);
  return layoutVisibleDiagram(filtered.nodes, filtered.edges, direction);
};

const layoutBaseFor = (
  entity: BasedEntity,
  base: FlatDiagram,
  direction: LayoutDirection,
  inputs: BaseLayoutInputs,
): Promise<FlatDiagram> => {
  if (entity === 'unit') {
    return layoutUnitDiagram(base.nodes, base.edges, inputs.unitInstanceFilter, direction);
  }
  if (entity === 'team') return layoutTeamBase(base, direction, inputs.teamCodeOnly);
  if (entity === 'component') {
    return layoutVisibleSubset(
      applyComponentDiagramVisibility,
      base,
      inputs.componentVisibility,
      direction,
    );
  }
  return layoutFeatureVersionBase(base, direction, inputs.featureVersion);
};

const serviceProjectionOf = (
  entity: DiagramEntity,
  searchParams: URLSearchParams,
): ServiceProjectionMode =>
  isServiceDiagramEntity(entity) && searchParams.get('projection') === 'draft'
    ? 'draft'
    : 'on-prod';

const legendFor = (entity: DiagramEntity, flat: FlatDiagram, unitId: string | undefined): Legend | null => {
  if (entity === 'unit' || entity === 'component' || entity === 'feature-version') return null;
  const legendSourceNodes =
    entity === 'team' ? hideTeamDiagramAnchor(flat.nodes, flat.edges).nodes : flat.nodes;
  return getLegend(legendSourceNodes, unitId);
};

const namesByIdOf = (graph: ArchitectureGraph | null): Map<string, string> =>
  new Map(
    (graph?.nodes ?? [])
      .map((graphNode): readonly [string, string] => [graphNode.id, graphNode.name.trim()])
      .filter(([, label]) => label.length > 0),
  );

type FitViewOnLoad = {
  readonly reactFlowInstance: RefObject<DiagramFlowInstance | null>;
  readonly requestFitView: () => void;
  readonly handleFlowInit: (instance: DiagramFlowInstance) => void;
};

const useFitViewOnLoad = (): FitViewOnLoad => {
  const [diagramFitGeneration, setDiagramFitGeneration] = useState(0);
  const reactFlowInstance = useRef<DiagramFlowInstance | null>(null);

  useEffect(() => {
    if (diagramFitGeneration === 0) return;
    const frame = requestAnimationFrame(() => {
      reactFlowInstance.current?.fitView({ padding: 0.15, duration: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [diagramFitGeneration]);

  const requestFitView = useCallback(() => setDiagramFitGeneration((value) => value + 1), []);
  const handleFlowInit = useCallback((instance: DiagramFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  return { reactFlowInstance, requestFitView, handleFlowInit };
};

type UnitHover = Pick<
  DiagramLoad,
  'flowNodes' | 'flowEdges' | 'onUnitNodeMouseEnter' | 'onUnitNodeMouseLeave'
> & { readonly setHoveredNodeId: Dispatch<SetStateAction<string | null>> };

const useUnitHover = (entity: DiagramEntity, nodes: ViewNode[], edges: ViewEdge[]): UnitHover => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const unitHoverPainted = useMemo(() => {
    if (entity !== 'unit') return null;
    const path = hoveredNodeId ? collectHoverPathIds(hoveredNodeId, nodes, edges, 'unit') : null;
    return applyHoverPathHighlight(nodes, edges, path);
  }, [entity, hoveredNodeId, nodes, edges]);

  const flowEdges = useMemo(
    () => prepareDependsOnCanvasEdges(unitHoverPainted?.edges ?? edges),
    [unitHoverPainted?.edges, edges],
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

  return {
    flowNodes: unitHoverPainted?.nodes ?? nodes,
    flowEdges,
    onUnitNodeMouseEnter,
    onUnitNodeMouseLeave,
    setHoveredNodeId,
  };
};

type RelayoutTriggers = {
  readonly entity: DiagramEntity;
  readonly filters: DiagramFilters;
  readonly impactHighlightIds: ImpactHighlightIds;
  readonly layoutRefs: DiagramLayoutRefs;
  readonly pushBaseLayout: (entity: BasedEntity) => Promise<void>;
};

const useFilterRelayout = ({
  entity,
  filters,
  impactHighlightIds,
  layoutRefs,
  pushBaseLayout,
}: RelayoutTriggers): void => {
  const { bases } = layoutRefs;

  useEffect(() => {
    if (entity !== 'unit' || !bases.unit.current) return;
    void pushBaseLayout('unit');
  }, [filters.unitInstanceFilter, impactHighlightIds, entity, bases, pushBaseLayout]);

  useEffect(() => {
    if (entity !== 'team' || !bases.team.current) return;
    void pushBaseLayout('team');
  }, [filters.teamCodeOnly, impactHighlightIds, entity, bases, pushBaseLayout]);

  useEffect(() => {
    if (entity !== 'component' || !bases.component.current) return;
    void pushBaseLayout('component');
  }, [filters.componentNodeVisibility, impactHighlightIds, entity, bases, pushBaseLayout]);

  useEffect(() => {
    if (entity !== 'feature-version' || !bases['feature-version'].current) return;
    void pushBaseLayout('feature-version');
  }, [
    filters.featureVersionTeamsVisible,
    filters.featureVersionCrossUnitLinksVisible,
    impactHighlightIds,
    entity,
    bases,
    pushBaseLayout,
  ]);
};

export const useDiagramLoad = ({
  entity,
  diagramAnchorId,
  pathname,
  searchParams,
  unitId,
  showToast,
  archGraph,
  setArchGraph,
  filters,
}: UseDiagramLoadParams): DiagramLoad => {
  const {
    unitInstanceFilterRef,
    teamCodeOnlyRef,
    componentNodeVisibilityRef,
    featureVersionTeamsVisibleRef,
    featureVersionCrossUnitLinksVisibleRef,
    featureVersionCompareEnabledRef,
    featureVersionCompareInheritedFromIdRef,
    featureVersionLayoutIdsRef,
    featureVersionCrossUnitLinksVisible,
    setUnitFilterCatalog,
    setFeatureVersionCompareEnabledSynced,
    resetFiltersForRoute,
  } = filters;
  const [nodes, setNodes, onNodesChange] = useNodesState<ViewNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ViewEdge>([]);
  const [meta, setMeta] = useState<Legend | null>(null);
  const [impactHighlightIds, setImpactHighlightIds] = useState<ImpactHighlightIds>(null);
  const lastImpactModeRef = useRef<ImpactQueryMode>(ImpactQueryModeConst.Draft);
  const [layoutRefs] = useState(createLayoutRefs);
  const beginLayoutRequest = useLatestRequestGuard();
  const { reactFlowInstance, requestFitView, handleFlowInit } = useFitViewOnLoad();
  const { setHoveredNodeId, ...hover } = useUnitHover(entity, nodes, edges);

  const readLayoutInputs = useCallback(
    (): BaseLayoutInputs => ({
      unitInstanceFilter: unitInstanceFilterRef.current,
      teamCodeOnly: teamCodeOnlyRef.current,
      componentVisibility: componentNodeVisibilityRef.current,
      featureVersion: {
        compareDiff: layoutRefs.featureVersionCompareDiff.current,
        teamsVisible: featureVersionTeamsVisibleRef.current,
        crossUnitLinksVisible: featureVersionCrossUnitLinksVisibleRef.current,
        layoutIds: featureVersionLayoutIdsRef.current,
      },
    }),
    [
      unitInstanceFilterRef,
      teamCodeOnlyRef,
      componentNodeVisibilityRef,
      layoutRefs,
      featureVersionTeamsVisibleRef,
      featureVersionCrossUnitLinksVisibleRef,
      featureVersionLayoutIdsRef,
    ],
  );

  const pushBaseLayout = useCallback(
    async (target: BasedEntity) => {
      const base = layoutRefs.bases[target].current;
      if (base === null) return;
      const isLatest = beginLayoutRequest();
      const laid = await layoutBaseFor(
        target,
        base,
        layoutRefs.directions[target].current,
        readLayoutInputs(),
      );
      if (!isLatest()) return;
      const suppressImpact =
        target === 'feature-version' && featureVersionCompareEnabledRef.current;
      setNodes(withImpactFlags(laid.nodes, suppressImpact ? null : impactHighlightIds));
      setEdges(laid.edges);
    },
    [
      layoutRefs,
      beginLayoutRequest,
      readLayoutInputs,
      featureVersionCompareEnabledRef,
      impactHighlightIds,
      setNodes,
      setEdges,
    ],
  );

  const prepareForLoad = useCallback(() => {
    setImpactHighlightIds(null);
    setHoveredNodeId(null);
    basedEntities.forEach((based) => {
      layoutRefs.bases[based].current = null;
    });
    if (resetFiltersForRoute(entity, diagramAnchorId)) {
      layoutRefs.featureVersionCompareDiff.current = null;
    }
  }, [entity, diagramAnchorId, layoutRefs, resetFiltersForRoute, setHoveredNodeId]);

  const assignLoadedBase = useCallback(
    (flat: FlatDiagram) => {
      basedEntities.forEach((based) => {
        layoutRefs.bases[based].current = based === entity ? flat : null;
      });
      if (isBasedEntity(entity)) layoutRefs.directions[entity].current = 'LR';
      layoutRefs.canvasDirection.current = 'LR';
    },
    [entity, layoutRefs],
  );

  /** Возвращает базу для раскладки feature-version (с учётом сравнения) или null, если запрос устарел. */
  const resolveFeatureVersionLoadBase = useCallback(
    async (
      raw: ArchitectureGraph,
      flat: FlatDiagram,
      isLatest: () => boolean,
    ): Promise<FlatDiagram | null> => {
      if (entity !== 'feature-version' || !diagramAnchorId) return flat;
      if (!featureVersionCompareEnabledRef.current) {
        layoutRefs.featureVersionCompareDiff.current = null;
        return flat;
      }
      const inheritedFromId = featureVersionCompareInheritedFromIdRef.current;
      if (inheritedFromId === null) {
        layoutRefs.featureVersionCompareDiff.current = null;
        setFeatureVersionCompareEnabledSynced(false);
        return flat;
      }
      const previousGraph = await diagramsApi.featureVersion(inheritedFromId);
      if (!isLatest()) return null;
      const compare = buildFeatureVersionCompareBase(raw, previousGraph, diagramAnchorId);
      layoutRefs.featureVersionCompareDiff.current = compare.diff;
      const compareFlat = { nodes: compare.flat.nodes, edges: styleAnomalyEdges(compare.flat.edges) };
      layoutRefs.bases['feature-version'].current = compareFlat;
      return compareFlat;
    },
    [
      entity,
      diagramAnchorId,
      layoutRefs,
      featureVersionCompareEnabledRef,
      featureVersionCompareInheritedFromIdRef,
      setFeatureVersionCompareEnabledSynced,
    ],
  );

  const loadDiagrams = useCallback(async () => {
    prepareForLoad();
    try {
      const serviceProjection = serviceProjectionOf(entity, searchParams);
      if (!entity || !diagramAnchorId) return;
      const isLatest = beginLayoutRequest();
      const raw = await diagramsApi.get(buildDiagramApiPath(entity, diagramAnchorId, serviceProjection));
      if (!isLatest()) return;
      setArchGraph(raw);
      const { flat, mode } = projectLoadedDiagram(raw, {
        entity,
        diagramAnchorId,
        pathname,
        serviceProjection,
      });
      lastImpactModeRef.current = mode;
      assignLoadedBase(flat);
      if (entity === 'unit') setUnitFilterCatalog(collectUnitDiagramFilterItems(flat.nodes));
      const layoutBase = await resolveFeatureVersionLoadBase(raw, flat, isLatest);
      if (layoutBase === null) return;
      const laid = isBasedEntity(entity)
        ? await layoutBaseFor(entity, layoutBase, 'LR', readLayoutInputs())
        : await layoutVisibleDiagram(flat.nodes, flat.edges, 'LR');
      if (!isLatest()) return;
      setNodes(laid.nodes);
      setEdges(laid.edges);
      setMeta(legendFor(entity, flat, unitId));
      requestFitView();
    } catch (err) {
      console.error('Error loading diagrams:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    }
  }, [
    pathname,
    searchParams,
    entity,
    diagramAnchorId,
    unitId,
    setNodes,
    setEdges,
    beginLayoutRequest,
    showToast,
    prepareForLoad,
    setArchGraph,
    assignLoadedBase,
    setUnitFilterCatalog,
    resolveFeatureVersionLoadBase,
    readLayoutInputs,
    requestFitView,
  ]);

  useEffect(() => {
    void loadDiagrams();
  }, [loadDiagrams]);

  useFilterRelayout({ entity, filters, impactHighlightIds, layoutRefs, pushBaseLayout });

  useEffect(() => {
    if (entity === 'unit' || entity === 'team') return;
    setNodes((prev) => withImpactFlags(prev, impactHighlightIds));
  }, [impactHighlightIds, entity, setNodes]);

  const layoutFeatureVersionCompareOff = useCallback(
    async (graph: ArchitectureGraph, featureVersionId: string) => {
      setFeatureVersionCompareEnabledSynced(false);
      layoutRefs.featureVersionCompareDiff.current = null;
      const isLatest = beginLayoutRequest();
      const flat = buildFeatureVersionFlatBase(graph, featureVersionId);
      layoutRefs.bases['feature-version'].current = flat;
      const laid = await layoutFeatureVersionBase(
        flat,
        layoutRefs.directions['feature-version'].current,
        readLayoutInputs().featureVersion,
      );
      if (!isLatest()) return;
      setNodes(laid.nodes);
      setEdges(laid.edges);
    },
    [layoutRefs, beginLayoutRequest, readLayoutInputs, setFeatureVersionCompareEnabledSynced, setNodes, setEdges],
  );

  const layoutFeatureVersionCompareOn = useCallback(
    async (graph: ArchitectureGraph, featureVersionId: string) => {
      const inheritedFromId = featureVersionCompareInheritedFromIdRef.current;
      if (inheritedFromId === null) return;
      const previousGraph = await diagramsApi.featureVersion(inheritedFromId);
      const compare = buildFeatureVersionCompareBase(graph, previousGraph, featureVersionId);
      layoutRefs.featureVersionCompareDiff.current = compare.diff;
      layoutRefs.bases['feature-version'].current = compare.flat;
      const isLatest = beginLayoutRequest();
      const laid = await layoutFeatureVersionBase(
        compare.flat,
        layoutRefs.directions['feature-version'].current,
        readLayoutInputs().featureVersion,
      );
      if (!isLatest()) return;
      setFeatureVersionCompareEnabledSynced(true);
      setNodes(withImpactFlags(laid.nodes, null));
      setEdges(laid.edges);
      setImpactHighlightIds((previous) => (previous === null ? previous : null));
    },
    [
      featureVersionCompareInheritedFromIdRef,
      layoutRefs,
      beginLayoutRequest,
      readLayoutInputs,
      setFeatureVersionCompareEnabledSynced,
      setNodes,
      setEdges,
    ],
  );

  const applyCompare = useCallback(
    async (enabled: boolean) => {
      if (entity !== 'feature-version' || !diagramAnchorId || !archGraph) return;
      try {
        await (enabled ? layoutFeatureVersionCompareOn : layoutFeatureVersionCompareOff)(
          archGraph,
          diagramAnchorId,
        );
      } catch (err) {
        setFeatureVersionCompareEnabledSynced(false);
        layoutRefs.featureVersionCompareDiff.current = null;
        showToast(getErrorMessage(err), ToastVariant.Error);
      }
    },
    [
      entity,
      diagramAnchorId,
      archGraph,
      layoutFeatureVersionCompareOn,
      layoutFeatureVersionCompareOff,
      setFeatureVersionCompareEnabledSynced,
      layoutRefs,
      showToast,
    ],
  );

  const getCanvasLayoutDirection = useCallback(
    (): LayoutDirection =>
      isBasedEntity(entity)
        ? layoutRefs.directions[entity].current
        : layoutRefs.canvasDirection.current,
    [entity, layoutRefs],
  );

  const onLayout = useCallback(
    async (direction: LayoutDirection = 'TB') => {
      if (isBasedEntity(entity) && layoutRefs.bases[entity].current) {
        layoutRefs.directions[entity].current = direction;
        await pushBaseLayout(entity);
        return;
      }
      layoutRefs.canvasDirection.current = direction;
      const isLatest = beginLayoutRequest();
      const laid = await getLayoutedElements(nodes, edges, direction);
      if (!isLatest()) return;
      setNodes(laid.nodes);
      setEdges(laid.edges);
    },
    [entity, layoutRefs, nodes, edges, setNodes, setEdges, beginLayoutRequest, pushBaseLayout],
  );

  const propertyDialogsUnitId = useMemo(
    () =>
      featureDiagramUnitIdFromGraph(archGraph, entity, diagramAnchorId) ??
      (entity === 'unit' && diagramAnchorId ? diagramAnchorId : unitId),
    [archGraph, entity, diagramAnchorId, unitId],
  );

  const featureVersionTable = useMemo(() => {
    if (entity !== 'feature-version') return null;
    return buildFeatureVersionCompositionTable({
      nodes,
      edges,
      homeUnitId: propertyDialogsUnitId,
      crossUnitLinksVisible: featureVersionCrossUnitLinksVisible,
      namesById: namesByIdOf(archGraph),
    });
  }, [entity, archGraph, nodes, edges, propertyDialogsUnitId, featureVersionCrossUnitLinksVisible]);

  return {
    nodes,
    edges,
    setNodes,
    onNodesChange,
    onEdgesChange,
    ...hover,
    meta,
    impactHighlightIds,
    setImpactHighlightIds,
    lastImpactModeRef,
    loadDiagrams,
    applyCompare,
    onLayout,
    getCanvasLayoutDirection,
    reactFlowInstance,
    handleFlowInit,
    propertyDialogsUnitId,
    featureVersionTable,
  };
};
