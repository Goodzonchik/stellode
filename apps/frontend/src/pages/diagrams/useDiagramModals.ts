import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { Connection } from '@xyflow/react';
import {
  parseImpactAnalysisResult,
  VersionStatus,
  type ArchitectureGraph,
  type CheckFeatureVersionReadyResult,
  type ViewEdge,
  type ViewNode,
} from '@stellode/models';
import { componentVersionsApi } from '../../api/component-versions-api';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { impactApi } from '../../api/impact-api';
import { useFeatureVersionReadinessCheck } from '../../hooks/useFeatureVersionReadinessCheck';
import { ToastVariant } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/axios-error';
import type { ComponentCreateSuccess } from '../components/ComponentCreateDialog';
import type { SelectedVersion } from './AddComponentDialog';
import { buildBindFeatureComponentVersionsAddBody } from './build-bind-feature-component-versions-add-body';
import { buildEdgeContextMenuItems } from './build-edge-context-menu-items';
import type { FeatureVersionTableRow } from './build-feature-version-composition-table';
import { buildRaiseFeatureComponentVersionBody } from './build-raise-feature-component-version-body';
import {
  collectFeatureVersionUsesCvOptions,
  type FeatureVersionUsesCvOption,
} from './collect-feature-version-uses-cv-options';
import { collectImpactHighlightIds } from './collect-impact-highlight-ids';
import type { DependsOnConnection } from './depends-on-connection';
import {
  getDiagramContextMenuItems,
  type DiagramContextAction,
  type DiagramMenuItem,
} from './diagram-context-menu.config';
import type { EdgeContextMenuState, NodeContextMenuState } from './diagram-context-menu-state';
import { runPaneDiagramMenuAction } from './diagram-menu-action';
import { featureDiagramUnitIdFromGraph } from './feature-diagram-unit-id-from-graph';
import { featureVersionTableRowActions } from './feature-version-table-row-actions';
import { filterNodeMenuForFeatureVersionCompare } from './filter-node-menu-for-feature-version-compare';
import { filterPaneMenuItemsForFeatureVersionReadOnly } from './filter-pane-menu-for-feature-version-read-only';
import {
  filterRaiseComponentVersionCandidates,
  type RaiseComponentVersionCandidate,
} from './filter-raise-component-version-candidates';
import { isFlatFeatureVersionComponentNode } from './is-flat-feature-version-component-node';
import { buildNodeContextMenuItems } from './node-context-menu-items';
import { parseComponentVersionListRows } from './parse-component-version-list-rows';
import { resolveComponentIdForVersion } from './resolve-component-id-for-version';
import { resolveConnectionSourceIds } from './resolve-connection-source-ids';
import { resolveDependsOnConnection } from './resolve-depends-on-connection';
import { resolveEdgeDependsOnApps } from './resolve-edge-depends-on-apps';
import { resolveImpactHttpTarget } from './resolve-impact-api-target';
import { resolveOpenInListTarget } from './resolve-open-in-list-target';
import { resolveSourceNodeId } from './resolve-source-node-id';
import { isServiceArchived, isServiceDiagramEntity } from './service-diagram-entity';
import { shouldBindComponentToFeatureVersion } from './should-bind-component-to-feature-version';
import { toSourceIdNodes } from './to-source-id-nodes';
import type { DiagramEntity, DiagramFilters } from './useDiagramFilters';
import type { DiagramLoad, ShowToast } from './useDiagramLoad';
import { viewNodeFromSelectedVersion } from './view-node-from-selected-version';

export type MenuPosition = { readonly x: number; readonly y: number };

export type RemoveFeatureTarget = { readonly id: string; readonly name: string };

export type CrossUnitDependsTarget = {
  readonly componentVersionId: string;
  readonly applicationId: string;
};

export type ExcludeFromFeatureTarget = CrossUnitDependsTarget & { readonly label: string };

export type DeleteDependsOnTarget = {
  readonly sourceComponentVersionId: string;
  readonly targetComponentVersionId: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
  readonly edgeLabel: string;
};

export type RaiseComponentTarget = ExcludeFromFeatureTarget & {
  readonly candidates: readonly RaiseComponentVersionCandidate[];
};

export type FeatureDependsOnTarget = {
  readonly consumerCvId: string;
  readonly consumerApplicationId: string;
  readonly consumerLabel: string;
  readonly providerOptions: readonly FeatureVersionUsesCvOption[];
  readonly fixedProviderCvId?: string;
  readonly fixedProviderApplicationId?: string;
  readonly fixedProviderLabel?: string;
};

export type NodeMenuTarget = {
  readonly nodeId: string;
  readonly applicationId?: string;
  readonly isFlatComponent?: boolean;
};

type PaneContextMenuEvent = Pick<MouseEvent, 'preventDefault' | 'clientX' | 'clientY'>;

export type UseDiagramModalsParams = {
  readonly entity: DiagramEntity;
  readonly diagramAnchorId: string | undefined;
  readonly unitId: string | undefined;
  readonly archGraph: ArchitectureGraph | null;
  readonly navigate: NavigateFunction;
  readonly showToast: ShowToast;
  readonly filters: Pick<
    DiagramFilters,
    'isFeatureVersionDiagramReadOnly' | 'featureVersionCompareEnabled'
  >;
  readonly load: Pick<
    DiagramLoad,
    | 'nodes'
    | 'setNodes'
    | 'loadDiagrams'
    | 'setImpactHighlightIds'
    | 'lastImpactModeRef'
    | 'reactFlowInstance'
  >;
};

export type DiagramModals = {
  readonly contextMenu: MenuPosition | null;
  readonly nodeContextMenu: NodeContextMenuState | null;
  readonly edgeContextMenu: EdgeContextMenuState | null;
  readonly menuItems: DiagramMenuItem[];
  readonly nodeMenuItems: DiagramMenuItem[];
  readonly edgeMenuItems: DiagramMenuItem[];
  readonly closeContextMenu: () => void;
  readonly closeNodeContextMenu: () => void;
  readonly closeEdgeContextMenu: () => void;
  readonly onPaneContextMenu: (event: PaneContextMenuEvent) => void;
  readonly onNodeContextMenu: (event: ReactMouseEvent, node: ViewNode) => void;
  readonly onEdgeContextMenu: (event: ReactMouseEvent, edge: ViewEdge) => void;
  readonly onConnect: (params: Connection) => void;
  readonly handlePaneMenuAction: (action: DiagramContextAction) => void;
  readonly handleNodeMenuAction: (
    action: DiagramContextAction,
    override?: NodeMenuTarget,
  ) => Promise<void>;
  readonly handleEdgeMenuAction: (action: DiagramContextAction) => void;
  readonly featureVersionTablePaneActions: DiagramMenuItem[];
  readonly featureVersionTableActionsForRow: (
    row: FeatureVersionTableRow,
    composition: boolean,
  ) => readonly DiagramMenuItem[];
  readonly handleFeatureVersionTableRowAction: (
    action: DiagramContextAction,
    row: FeatureVersionTableRow,
  ) => void;
  readonly showFeatureVersionCheckReady: boolean;
  readonly handleCheckFeatureVersionReady: () => void;
  readonly readinessModalOpen: boolean;
  readonly readinessResult: CheckFeatureVersionReadyResult | null;
  readonly closeReadinessModal: () => void;
  readonly propertyDialogsRequireApplicationBinding: boolean;
  readonly crossUnitExcludeHomeUnitIds: readonly string[];
  readonly createDialogOpen: boolean;
  readonly closeCreateDialog: () => void;
  readonly handleComponentCreated: (created?: ComponentCreateSuccess | null) => Promise<void>;
  readonly addComponentOpen: boolean;
  readonly closeAddComponent: () => void;
  readonly handleComponentVersionSelected: (version: SelectedVersion) => Promise<void>;
  readonly dependsOnConnection: DependsOnConnection | null;
  readonly closeDependsOnConnection: () => void;
  readonly featureDependsOn: FeatureDependsOnTarget | null;
  readonly closeFeatureDependsOn: () => void;
  readonly crossUnitDependsTarget: CrossUnitDependsTarget | null;
  readonly closeCrossUnitDepends: () => void;
  readonly excludeFromFeatureTarget: ExcludeFromFeatureTarget | null;
  readonly closeExcludeFromFeature: () => void;
  readonly handleExcludeFromFeatureSuccess: () => Promise<void>;
  readonly deleteDependsOnTarget: DeleteDependsOnTarget | null;
  readonly closeDeleteDependsOn: () => void;
  readonly handleDeleteDependsOnSuccess: () => Promise<void>;
  readonly raiseComponentTarget: RaiseComponentTarget | null;
  readonly closeRaiseComponent: () => void;
  readonly handleRaiseComponentSuccess: () => Promise<void>;
  readonly addFeatureToServiceOpen: boolean;
  readonly closeAddFeatureToService: () => void;
  readonly handleAddFeatureToServiceSuccess: () => void;
  readonly removeFeatureTarget: RemoveFeatureTarget | null;
  readonly closeRemoveFeature: () => void;
  readonly handleRemoveFeatureSuccess: () => void;
};

const needsApplicationMessage = 'Нужна привязка к приложению';
const unsupportedConnectionMessage =
  'Связь не поддерживается: используйте DEPENDS_ON между версиями компонентов';
const componentAddedToFeatureMessage = 'Компонент добавлен в состав фичи';
const componentVersionRaisedMessage =
  'Версия компонента поднята. Проверьте зависимости при необходимости.';

const featureVersionEditActions: ReadonlySet<DiagramContextAction> = new Set<DiagramContextAction>([
  'crossUnitDependsOn',
  'fvAddDependsOn',
  'fvReplaceUses',
  'fvRemoveUses',
]);

type ClosableState<T> = readonly [T | null, Dispatch<SetStateAction<T | null>>, () => void];

const useClosableState = <T>(): ClosableState<T> => {
  const [value, setValue] = useState<T | null>(null);
  const close = useCallback(() => setValue(null), []);
  return [value, setValue, close] as const;
};

type DialogFlag = readonly [boolean, () => void, () => void];

const useDialogFlag = (): DialogFlag => {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  return [open, show, close] as const;
};

const resolveNodeLabel = (
  nodes: readonly ViewNode[],
  graph: ArchitectureGraph,
  nodeId: string,
): string => {
  const canvasNode = nodes.find((node) => resolveSourceNodeId(node) === nodeId);
  const graphNode = graph.nodes.find((node) => node.id === nodeId);
  return canvasNode?.data.label ?? graphNode?.name ?? nodeId;
};

const buildPaneMenuItems = (
  entity: DiagramEntity,
  archGraph: ArchitectureGraph | null,
  diagramAnchorId: string | undefined,
  isReadOnly: boolean,
): DiagramMenuItem[] => {
  const items = getDiagramContextMenuItems(isServiceDiagramEntity(entity) ? 'service' : entity);
  const visible =
    isServiceDiagramEntity(entity) && isServiceArchived(archGraph, diagramAnchorId)
      ? items.filter((item) => item.action !== 'serviceAddFeature')
      : items;
  return filterPaneMenuItemsForFeatureVersionReadOnly(visible, isReadOnly);
};

const isDraftFeatureVersionAnchor = (
  archGraph: ArchitectureGraph,
  diagramAnchorId: string,
): boolean => {
  const anchor = archGraph.nodes.find((node) => node.id === diagramAnchorId);
  return (
    anchor !== undefined &&
    anchor.labels.includes('FeatureVersion') &&
    anchor.status === VersionStatus.Draft
  );
};

const buildEdgeMenuState = (
  event: ReactMouseEvent,
  edge: ViewEdge,
  nodes: readonly ViewNode[],
): EdgeContextMenuState => {
  const sourceNode = nodes.find((node) => node.id === edge.source);
  const targetNode = nodes.find((node) => node.id === edge.target);
  const sourceCvId = sourceNode ? resolveSourceNodeId(sourceNode) : edge.source;
  const targetCvId = targetNode ? resolveSourceNodeId(targetNode) : edge.target;
  const apps = resolveEdgeDependsOnApps(edge, sourceNode, targetNode);
  const sourceLabel = sourceNode?.data.label ?? sourceCvId;
  const targetLabel = targetNode?.data.label ?? targetCvId;
  return {
    x: event.clientX,
    y: event.clientY,
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
  };
};

export const useDiagramModals = ({
  entity,
  diagramAnchorId,
  unitId,
  archGraph,
  navigate,
  showToast,
  filters,
  load,
}: UseDiagramModalsParams): DiagramModals => {
  const { isFeatureVersionDiagramReadOnly, featureVersionCompareEnabled } = filters;
  const { nodes, setNodes, loadDiagrams, setImpactHighlightIds, lastImpactModeRef, reactFlowInstance } =
    load;
  const [contextMenu, setContextMenu, closeContextMenu] = useClosableState<MenuPosition>();
  const [nodeContextMenu, setNodeContextMenu, closeNodeContextMenu] =
    useClosableState<NodeContextMenuState>();
  const [edgeContextMenu, setEdgeContextMenu, closeEdgeContextMenu] =
    useClosableState<EdgeContextMenuState>();
  const [createDialogOpen, openCreateDialog, closeCreateDialog] = useDialogFlag();
  const [addComponentOpen, openAddComponent, closeAddComponent] = useDialogFlag();
  const [addFeatureToServiceOpen, openAddFeatureToService, closeAddFeatureToService] =
    useDialogFlag();
  const [dependsOnConnection, setDependsOnConnection, closeDependsOnConnection] =
    useClosableState<DependsOnConnection>();
  const [removeFeatureTarget, setRemoveFeatureTarget, closeRemoveFeature] =
    useClosableState<RemoveFeatureTarget>();
  const [crossUnitDependsTarget, setCrossUnitDependsTarget, closeCrossUnitDepends] =
    useClosableState<CrossUnitDependsTarget>();
  const [excludeFromFeatureTarget, setExcludeFromFeatureTarget, closeExcludeFromFeature] =
    useClosableState<ExcludeFromFeatureTarget>();
  const [deleteDependsOnTarget, setDeleteDependsOnTarget, closeDeleteDependsOn] =
    useClosableState<DeleteDependsOnTarget>();
  const [raiseComponentTarget, setRaiseComponentTarget, closeRaiseComponent] =
    useClosableState<RaiseComponentTarget>();
  const [featureDependsOn, setFeatureDependsOn, closeFeatureDependsOn] =
    useClosableState<FeatureDependsOnTarget>();
  const contextMenuPosition = useRef<MenuPosition>({ x: 0, y: 0 });

  const crossUnitExcludeHomeUnitIds = useMemo((): readonly string[] => {
    const homeUnitId = featureDiagramUnitIdFromGraph(archGraph, entity, diagramAnchorId);
    return homeUnitId ? [homeUnitId] : [];
  }, [archGraph, entity, diagramAnchorId]);

  const menuItems = useMemo(
    () => buildPaneMenuItems(entity, archGraph, diagramAnchorId, isFeatureVersionDiagramReadOnly),
    [entity, archGraph, diagramAnchorId, isFeatureVersionDiagramReadOnly],
  );

  const nodeMenuItemsFor = useCallback(
    (nodeId: string, isFlatComponent: boolean): DiagramMenuItem[] =>
      filterNodeMenuForFeatureVersionCompare(
        buildNodeContextMenuItems({
          graph: archGraph,
          entity,
          diagramAnchorId,
          nodeId,
          currentUnitId: unitId,
          isFlatComponent,
        }),
        featureVersionCompareEnabled,
      ),
    [archGraph, entity, diagramAnchorId, unitId, featureVersionCompareEnabled],
  );

  const nodeMenuItems = useMemo(() => {
    if (!nodeContextMenu || !archGraph) return [];
    return nodeMenuItemsFor(nodeContextMenu.nodeId, nodeContextMenu.isFlatComponent === true);
  }, [nodeContextMenu, archGraph, nodeMenuItemsFor]);

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
    return isDraftFeatureVersionAnchor(archGraph, diagramAnchorId);
  }, [entity, diagramAnchorId, archGraph, featureVersionCompareEnabled]);

  const onPaneContextMenu = useCallback(
    (event: PaneContextMenuEvent) => {
      event.preventDefault();
      setNodeContextMenu(null);
      setEdgeContextMenu(null);
      contextMenuPosition.current = { x: event.clientX, y: event.clientY };
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    [setContextMenu, setNodeContextMenu, setEdgeContextMenu],
  );

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: ViewNode) => {
      event.preventDefault();
      setContextMenu(null);
      setEdgeContextMenu(null);
      setNodeContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: resolveSourceNodeId(node),
        ...(node.data.applicationId !== undefined
          ? { applicationId: node.data.applicationId }
          : {}),
        ...(entity === 'feature-version' && isFlatFeatureVersionComponentNode(node)
          ? { isFlatComponent: true }
          : {}),
      });
    },
    [entity, setContextMenu, setNodeContextMenu, setEdgeContextMenu],
  );

  const onEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: ViewEdge) => {
      event.preventDefault();
      setContextMenu(null);
      setNodeContextMenu(null);
      setEdgeContextMenu(buildEdgeMenuState(event, edge, nodes));
    },
    [nodes, setContextMenu, setNodeContextMenu, setEdgeContextMenu],
  );

  const connectFeatureVersion = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((node) => node.id === params.source);
      const targetNode = nodes.find((node) => node.id === params.target);
      if (
        (sourceNode !== undefined && isFlatFeatureVersionComponentNode(sourceNode)) ||
        (targetNode !== undefined && isFlatFeatureVersionComponentNode(targetNode))
      ) {
        showToast(needsApplicationMessage, ToastVariant.Error);
        return;
      }
      const endpoints = resolveConnectionSourceIds(params, nodes);
      const dep = resolveDependsOnConnection(endpoints.source, endpoints.target, toSourceIdNodes(nodes));
      const consumerId = dep?.consumerComponentVersionId;
      const providerId = dep?.providerComponentVersionId;
      if (!dep || consumerId == null || providerId == null || !diagramAnchorId) {
        showToast(unsupportedConnectionMessage, ToastVariant.Error);
        return;
      }
      const consumerApp = sourceNode?.data.applicationId;
      const providerApp = targetNode?.data.applicationId;
      if (!consumerApp || !providerApp) {
        showToast(needsApplicationMessage, ToastVariant.Error);
        return;
      }
      const consumerFlow = nodes.find((node) => resolveSourceNodeId(node) === consumerId);
      const providerFlow = nodes.find((node) => resolveSourceNodeId(node) === providerId);
      setFeatureDependsOn({
        consumerCvId: consumerId,
        consumerApplicationId: consumerApp,
        consumerLabel: consumerFlow?.data.label ?? consumerId,
        providerOptions: collectFeatureVersionUsesCvOptions(nodes, consumerId),
        fixedProviderCvId: providerId,
        fixedProviderApplicationId: providerApp,
        fixedProviderLabel: providerFlow?.data.label ?? providerId,
      });
    },
    [nodes, showToast, diagramAnchorId, setFeatureDependsOn],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isFeatureVersionDiagramReadOnly) return;
      if (entity === 'feature-version') {
        connectFeatureVersion(params);
        return;
      }
      const endpoints = resolveConnectionSourceIds(params, nodes);
      const dep = resolveDependsOnConnection(endpoints.source, endpoints.target, toSourceIdNodes(nodes));
      if (dep) {
        setDependsOnConnection(dep);
        return;
      }
      showToast(unsupportedConnectionMessage, ToastVariant.Error);
    },
    [
      nodes,
      showToast,
      entity,
      isFeatureVersionDiagramReadOnly,
      connectFeatureVersion,
      setDependsOnConnection,
    ],
  );

  const bindToFeatureVersion = useCallback(
    async (featureVersionId: string, componentVersionId: string, applicationId: string) => {
      await featureVersionsApi.bindComponentVersions(
        buildBindFeatureComponentVersionsAddBody(featureVersionId, {
          componentVersionId,
          applicationId,
        }),
      );
      showToast(componentAddedToFeatureMessage, ToastVariant.Success);
    },
    [showToast],
  );

  const handleComponentCreated = useCallback(
    async (created?: ComponentCreateSuccess | null) => {
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
          await bindToFeatureVersion(featureVersionId, draftCvId, applicationId);
        } catch (err) {
          showToast(getErrorMessage(err), ToastVariant.Error);
        }
      }
      await loadDiagrams();
    },
    [diagramAnchorId, entity, loadDiagrams, showToast, bindToFeatureVersion],
  );

  const handleComponentVersionSelected = useCallback(
    async (version: SelectedVersion) => {
      const featureVersionId = diagramAnchorId;
      if (!shouldBindComponentToFeatureVersion(entity, featureVersionId)) {
        const position = reactFlowInstance.current?.screenToFlowPosition(
          contextMenuPosition.current,
        ) ?? { x: 100, y: 100 };
        setNodes((prev) => [...prev, viewNodeFromSelectedVersion(version, position)]);
        return;
      }
      if (!version.applicationId || !featureVersionId) {
        showToast('Нужно выбрать приложение для привязки', ToastVariant.Error);
        return;
      }
      try {
        await bindToFeatureVersion(featureVersionId, version.id, version.applicationId);
        await loadDiagrams();
      } catch (err) {
        showToast(getErrorMessage(err), ToastVariant.Error);
      }
    },
    [diagramAnchorId, entity, loadDiagrams, setNodes, showToast, reactFlowInstance, bindToFeatureVersion],
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
          closeMenu: closeContextMenu,
          openCreateDialog,
          openAddComponentDialog: openAddComponent,
          openAddFeatureToServiceDialog: openAddFeatureToService,
        });
      }
    },
    [
      isFeatureVersionDiagramReadOnly,
      closeContextMenu,
      openCreateDialog,
      openAddComponent,
      openAddFeatureToService,
    ],
  );

  const handleEdgeMenuAction = useCallback(
    (action: DiagramContextAction) => {
      const snapshot = edgeContextMenu;
      setEdgeContextMenu(null);
      if (!snapshot) return;
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
    [
      edgeContextMenu,
      isFeatureVersionDiagramReadOnly,
      showToast,
      setEdgeContextMenu,
      setDeleteDependsOnTarget,
    ],
  );

  const showImpact = useCallback(
    async (graph: ArchitectureGraph, nodeId: string) => {
      const target = resolveImpactHttpTarget(graph, nodeId);
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
    },
    [lastImpactModeRef, setImpactHighlightIds, showToast],
  );

  const raiseComponentVersion = useCallback(
    async (graph: ArchitectureGraph, featureVersionId: string, nodeId: string, applicationId: string) => {
      const componentElementId = resolveComponentIdForVersion(graph, nodeId);
      const fromVersionNumber = graph.nodes.find((node) => node.id === nodeId)?.versionNumber;
      if (!componentElementId || fromVersionNumber === undefined) {
        showToast('Не удалось определить компонент для поднятия версии', ToastVariant.Error);
        return;
      }
      const label = resolveNodeLabel(nodes, graph, nodeId);
      try {
        const versionRows = await componentVersionsApi.list(componentElementId);
        const candidates = filterRaiseComponentVersionCandidates(
          parseComponentVersionListRows(versionRows),
          fromVersionNumber,
        );
        if (candidates.length >= 2) {
          setRaiseComponentTarget({ componentVersionId: nodeId, applicationId, label, candidates });
          return;
        }
        await featureVersionsApi.raiseComponentVersion(
          buildRaiseFeatureComponentVersionBody(
            featureVersionId,
            nodeId,
            applicationId,
            candidates[0]?.id,
          ),
        );
        showToast(componentVersionRaisedMessage, ToastVariant.Success);
        await loadDiagrams();
      } catch (err: unknown) {
        showToast(getErrorMessage(err), ToastVariant.Error);
      }
    },
    [nodes, showToast, loadDiagrams, setRaiseComponentTarget],
  );

  const runFeatureVersionEditAction = useCallback(
    async (
      action: DiagramContextAction,
      graph: ArchitectureGraph,
      featureVersionId: string,
      target: CrossUnitDependsTarget,
    ) => {
      const { componentVersionId: nodeId, applicationId } = target;
      if (action === 'crossUnitDependsOn') {
        setCrossUnitDependsTarget(target);
        return;
      }
      if (action === 'fvAddDependsOn') {
        setFeatureDependsOn({
          consumerCvId: nodeId,
          consumerApplicationId: applicationId,
          consumerLabel: resolveNodeLabel(nodes, graph, nodeId),
          providerOptions: collectFeatureVersionUsesCvOptions(nodes, nodeId),
        });
        return;
      }
      if (action === 'fvRemoveUses') {
        setExcludeFromFeatureTarget({ ...target, label: resolveNodeLabel(nodes, graph, nodeId) });
        return;
      }
      await raiseComponentVersion(graph, featureVersionId, nodeId, applicationId);
    },
    [
      nodes,
      raiseComponentVersion,
      setCrossUnitDependsTarget,
      setFeatureDependsOn,
      setExcludeFromFeatureTarget,
    ],
  );

  const runAnchoredNodeAction = useCallback(
    async (
      action: DiagramContextAction,
      menuTarget: NodeMenuTarget,
      graph: ArchitectureGraph,
      featureVersionId: string,
    ) => {
      const { nodeId, applicationId } = menuTarget;
      if (action === 'serviceRemoveFeature') {
        const graphNode = graph.nodes.find((node) => node.id === nodeId);
        setRemoveFeatureTarget({ id: nodeId, name: graphNode?.name ?? nodeId });
        return;
      }
      if (!featureVersionEditActions.has(action)) return;
      if (!applicationId) {
        showToast(needsApplicationMessage, ToastVariant.Error);
        return;
      }
      await runFeatureVersionEditAction(action, graph, featureVersionId, {
        componentVersionId: nodeId,
        applicationId,
      });
    },
    [showToast, runFeatureVersionEditAction, setRemoveFeatureTarget],
  );

  const handleNodeMenuAction = useCallback(
    async (action: DiagramContextAction, override?: NodeMenuTarget) => {
      const menuTarget = override ?? nodeContextMenu;
      setNodeContextMenu(null);
      if (!menuTarget || !archGraph) return;
      if (action === 'openInList') {
        const path = resolveOpenInListTarget(archGraph, menuTarget.nodeId, unitId ?? '');
        if (path !== null) navigate(path);
        return;
      }
      if (isFeatureVersionDiagramReadOnly && featureVersionEditActions.has(action)) return;
      if (menuTarget.isFlatComponent === true && featureVersionEditActions.has(action)) {
        showToast(needsApplicationMessage, ToastVariant.Error);
        return;
      }
      if (action === 'showImpact') {
        await showImpact(archGraph, menuTarget.nodeId);
        return;
      }
      if (!diagramAnchorId) return;
      await runAnchoredNodeAction(action, menuTarget, archGraph, diagramAnchorId);
    },
    [
      nodeContextMenu,
      archGraph,
      diagramAnchorId,
      showToast,
      isFeatureVersionDiagramReadOnly,
      unitId,
      navigate,
      showImpact,
      runAnchoredNodeAction,
      setNodeContextMenu,
    ],
  );

  const {
    checkReady,
    modalOpen: readinessModalOpen,
    result: readinessResult,
    closeModal: closeReadinessModal,
  } = useFeatureVersionReadinessCheck(() => {
    void loadDiagrams();
  });

  const handleCheckFeatureVersionReady = useCallback(() => {
    if (!diagramAnchorId) return;
    void checkReady(diagramAnchorId);
  }, [diagramAnchorId, checkReady]);

  const featureVersionTablePaneActions = useMemo(
    () =>
      menuItems.filter(
        (item) => item.action === 'createComponent' || item.action === 'addComponent',
      ),
    [menuItems],
  );

  const featureVersionTableActionsForRow = useCallback(
    (row: FeatureVersionTableRow, composition: boolean): readonly DiagramMenuItem[] =>
      featureVersionTableRowActions(nodeMenuItemsFor(row.componentVersionId, row.flat), composition),
    [nodeMenuItemsFor],
  );

  const handleFeatureVersionTableRowAction = useCallback(
    (action: DiagramContextAction, row: FeatureVersionTableRow) => {
      void handleNodeMenuAction(action, {
        nodeId: row.componentVersionId,
        applicationId: row.applicationId,
        isFlatComponent: row.flat,
      });
    },
    [handleNodeMenuAction],
  );

  const reloadWithToast = useCallback(
    async (message: string) => {
      showToast(message, ToastVariant.Success);
      await loadDiagrams();
    },
    [showToast, loadDiagrams],
  );

  const handleExcludeFromFeatureSuccess = useCallback(
    () => reloadWithToast('Компонент исключён из фичи'),
    [reloadWithToast],
  );

  const handleDeleteDependsOnSuccess = useCallback(
    () => reloadWithToast('Связь DEPENDS_ON удалена'),
    [reloadWithToast],
  );

  const handleRaiseComponentSuccess = useCallback(
    () => reloadWithToast(componentVersionRaisedMessage),
    [reloadWithToast],
  );

  const handleAddFeatureToServiceSuccess = useCallback(() => {
    void reloadWithToast('Фича добавлена в услугу');
  }, [reloadWithToast]);

  const handleRemoveFeatureSuccess = useCallback(() => {
    void reloadWithToast('Фича снята с услуги');
  }, [reloadWithToast]);

  return {
    contextMenu,
    nodeContextMenu,
    edgeContextMenu,
    menuItems,
    nodeMenuItems,
    edgeMenuItems,
    closeContextMenu,
    closeNodeContextMenu,
    closeEdgeContextMenu,
    onPaneContextMenu,
    onNodeContextMenu,
    onEdgeContextMenu,
    onConnect,
    handlePaneMenuAction,
    handleNodeMenuAction,
    handleEdgeMenuAction,
    featureVersionTablePaneActions,
    featureVersionTableActionsForRow,
    handleFeatureVersionTableRowAction,
    showFeatureVersionCheckReady,
    handleCheckFeatureVersionReady,
    readinessModalOpen,
    readinessResult,
    closeReadinessModal,
    propertyDialogsRequireApplicationBinding: shouldBindComponentToFeatureVersion(
      entity,
      diagramAnchorId,
    ),
    crossUnitExcludeHomeUnitIds,
    createDialogOpen,
    closeCreateDialog,
    handleComponentCreated,
    addComponentOpen,
    closeAddComponent,
    handleComponentVersionSelected,
    dependsOnConnection,
    closeDependsOnConnection,
    featureDependsOn,
    closeFeatureDependsOn,
    crossUnitDependsTarget,
    closeCrossUnitDepends,
    excludeFromFeatureTarget,
    closeExcludeFromFeature,
    handleExcludeFromFeatureSuccess,
    deleteDependsOnTarget,
    closeDeleteDependsOn,
    handleDeleteDependsOnSuccess,
    raiseComponentTarget,
    closeRaiseComponent,
    handleRaiseComponentSuccess,
    addFeatureToServiceOpen,
    closeAddFeatureToService,
    handleAddFeatureToServiceSuccess,
    removeFeatureTarget,
    closeRemoveFeature,
    handleRemoveFeatureSuccess,
  };
};
