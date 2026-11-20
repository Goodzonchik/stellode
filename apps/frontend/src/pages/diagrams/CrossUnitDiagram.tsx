import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { diagramsApi } from '../../api/diagrams-api';
import {
  useEdgesState,
  useNodesState,
  type Edge,
} from '@xyflow/react';
import { architectureGraphToDiagram } from '../../common/architecture-graph-to-diagram';
import { Button } from 'antd';
import { getErrorMessage } from '../../utils/axios-error';
import type { ArchitectureGraph, ViewEdge, ViewNode } from '@stellode/models';
import { prepareDependsOnCanvasEdges } from './prepare-depends-on-canvas-edges';
import { getLayoutedElements } from './layout-diagram';
import { layoutVisibleDiagram } from './layout-visible-diagram';
import type { LayoutDirection } from './layout-direction';
import { DiagramCanvas } from './DiagramCanvas';
import { overviewVersionMergeConfig, mergeVersionNodes } from './merge-version-nodes';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';
import { parseCrossUnitBridgeEdgeId } from './parse-cross-unit-bridge-edge-id';
import { resolveCrossUnitCenterUnitId } from './resolve-cross-unit-center-unit-id';
import { useUnit } from '../../context/UnitContext';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { DiagramScopeTabs } from './DiagramScopeTabs';
import { collectHoverPathIds } from './collect-hover-path-ids';
import { applyHoverPathHighlight } from './apply-hover-path-highlight';
import { CrossUnitBridgeLegend } from './CrossUnitBridgeLegend';
import { DiagramContextMenu } from './DiagramContextMenu';
import { DiagramLegendShell } from './DiagramLegendShell';
import type { DiagramContextAction } from './diagram-context-menu.config';
import { buildNodeContextMenuItems } from './node-context-menu-items';
import { resolveOpenInListTarget } from './resolve-open-in-list-target';
import { resolveSourceNodeId } from './resolve-source-node-id';
import './Diagrams.css';

type FlatBridgeDiagram = {
  readonly nodes: ViewNode[];
  readonly edges: ViewEdge[];
  readonly unitIdA: string;
  readonly unitIdB: string;
};

type NodeContextMenuState = {
  readonly x: number;
  readonly y: number;
  readonly nodeId: string;
  readonly graph: ArchitectureGraph;
};

const unitNameById = (graph: ArchitectureGraph | null, id: string): string =>
  graph?.nodes.find((n) => n.id === id)?.name ?? id;

export function CrossUnitDiagram() {
  const { unit } = useUnit();
  const { id: routeUnitId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const centerUnitId = useMemo(
    () => resolveCrossUnitCenterUnitId(routeUnitId ?? null, unit?.id),
    [routeUnitId, unit?.id],
  );
  const [mainGraph, setMainGraph] = useState<ArchitectureGraph | null>(null);
  const [bridgeGraph, setBridgeGraph] = useState<ArchitectureGraph | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<ViewNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ViewEdge>([]);
  const [bridge, setBridge] = useState<readonly [string, string] | null>(null);
  const [detailNodes, setDetailNodes, onDetailNodesChange] = useNodesState<ViewNode>([]);
  const [detailEdges, setDetailEdges, onDetailEdgesChange] = useEdgesState<ViewEdge>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<NodeContextMenuState | null>(null);
  const [bridgeTeamsVisible, setBridgeTeamsVisible] = useState(true);
  const [bridgeCodeOnly, setBridgeCodeOnly] = useState(false);
  const overviewBaseRef = useRef<{ nodes: ViewNode[]; edges: ViewEdge[] } | null>(null);
  const bridgeBaseRef = useRef<FlatBridgeDiagram | null>(null);
  const overviewLayoutDirectionRef = useRef<LayoutDirection>('LR');
  const bridgeLayoutDirectionRef = useRef<LayoutDirection>('LR');

  const loadMain = useCallback(async () => {
    if (!centerUnitId) return;
    try {
      const raw = await diagramsApi.crossUnit(centerUnitId);
      setMainGraph(raw);
      const diagram = architectureGraphToDiagram(raw);
      overviewBaseRef.current = { nodes: diagram.nodes, edges: diagram.edges };
      overviewLayoutDirectionRef.current = 'LR';
      const layouted = await getLayoutedElements(diagram.nodes, diagram.edges, 'LR');
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } catch (e: unknown) {
      showToast(getErrorMessage(e), ToastVariant.Error);
    }
  }, [centerUnitId, setNodes, setEdges, showToast]);

  useEffect(() => {
    if (!centerUnitId) {
      setMainGraph(null);
      overviewBaseRef.current = null;
      setNodes([]);
      setEdges([]);
      setBridge(null);
      setHoveredNodeId(null);
      setNodeContextMenu(null);
      return;
    }
    setHoveredNodeId(null);
    void loadMain();
  }, [centerUnitId, loadMain, setNodes, setEdges]);

  const applyBridgeFlat = useCallback(
    async (
      flat: FlatBridgeDiagram,
      direction: LayoutDirection,
      visibility: { teamsVisible: boolean; codeOnly: boolean },
    ) => {
      const layouted = await layoutVisibleDiagram(flat.nodes, flat.edges, direction, {
        crossUnitBridge: { unitIdA: flat.unitIdA, unitIdB: flat.unitIdB },
        crossUnitBridgeVisibility: visibility,
      });
      setDetailNodes(layouted.nodes);
      setDetailEdges(layouted.edges);
    },
    [setDetailNodes, setDetailEdges],
  );

  const loadBridgeDetail = useCallback(
    async (pair: readonly [string, string]) => {
      try {
        const [a, b] = pair;
        const bridgeData = await diagramsApi.crossUnitBridge(a, b);
        setBridgeGraph(bridgeData);
        const diagram = architectureGraphToDiagram(bridgeData);
        const projected = projectComponentVersionsToComponents(diagram.nodes, diagram.edges);
        const merged = mergeVersionNodes(
          projected.nodes,
          projected.edges,
          overviewVersionMergeConfig,
        );
        const flat: FlatBridgeDiagram = {
          nodes: merged.nodes,
          edges: merged.edges,
          unitIdA: a,
          unitIdB: b,
        };
        bridgeBaseRef.current = flat;
        bridgeLayoutDirectionRef.current = 'LR';
        setBridgeTeamsVisible(true);
        setBridgeCodeOnly(false);
        await applyBridgeFlat(flat, 'LR', { teamsVisible: true, codeOnly: false });
      } catch (e: unknown) {
        showToast(getErrorMessage(e), ToastVariant.Error);
        bridgeBaseRef.current = null;
        setBridgeGraph(null);
        setDetailNodes([]);
        setDetailEdges([]);
      }
    },
    [applyBridgeFlat, setDetailNodes, setDetailEdges, showToast],
  );

  useEffect(() => {
    if (!bridge) {
      bridgeBaseRef.current = null;
      setBridgeGraph(null);
      setDetailNodes([]);
      setDetailEdges([]);
      setBridgeTeamsVisible(true);
      setBridgeCodeOnly(false);
      return;
    }
    void loadBridgeDetail(bridge);
  }, [bridge, loadBridgeDetail, setDetailNodes, setDetailEdges]);

  const onOverviewLayout = useCallback(
    async (direction: LayoutDirection) => {
      const base = overviewBaseRef.current;
      if (!base) return;
      overviewLayoutDirectionRef.current = direction;
      const layouted = await getLayoutedElements(base.nodes, base.edges, direction);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    },
    [setNodes, setEdges],
  );

  const onBridgeLayout = useCallback(
    async (direction: LayoutDirection) => {
      const flat = bridgeBaseRef.current;
      if (!flat) return;
      bridgeLayoutDirectionRef.current = direction;
      await applyBridgeFlat(flat, direction, {
        teamsVisible: bridgeTeamsVisible,
        codeOnly: bridgeCodeOnly,
      });
    },
    [applyBridgeFlat, bridgeTeamsVisible, bridgeCodeOnly],
  );

  const onBridgeTeamsVisibleChange = useCallback(
    (visible: boolean) => {
      setBridgeTeamsVisible(visible);
      const flat = bridgeBaseRef.current;
      if (!flat) return;
      void applyBridgeFlat(flat, bridgeLayoutDirectionRef.current, {
        teamsVisible: visible,
        codeOnly: bridgeCodeOnly,
      });
    },
    [applyBridgeFlat, bridgeCodeOnly],
  );

  const onBridgeCodeOnlyChange = useCallback(
    (codeOnly: boolean) => {
      setBridgeCodeOnly(codeOnly);
      const flat = bridgeBaseRef.current;
      if (!flat) return;
      void applyBridgeFlat(flat, bridgeLayoutDirectionRef.current, {
        teamsVisible: bridgeTeamsVisible,
        codeOnly,
      });
    },
    [applyBridgeFlat, bridgeTeamsVisible],
  );

  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    const parsed = parseCrossUnitBridgeEdgeId(edge.id);
    if (parsed) setBridge(parsed);
  }, []);

  const closeBridgeOverlay = useCallback(() => {
    setBridge(null);
    setNodeContextMenu(null);
  }, []);

  const onOverviewNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: ViewNode) => {
      event.preventDefault();
      if (!mainGraph) return;
      setNodeContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: resolveSourceNodeId(node),
        graph: mainGraph,
      });
    },
    [mainGraph],
  );

  const onDetailNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: ViewNode) => {
      event.preventDefault();
      if (!bridgeGraph) return;
      setNodeContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: resolveSourceNodeId(node),
        graph: bridgeGraph,
      });
    },
    [bridgeGraph],
  );

  const nodeMenuItems = useMemo(() => {
    if (!nodeContextMenu) return [];
    return buildNodeContextMenuItems({
      graph: nodeContextMenu.graph,
      entity: 'cross-unit',
      diagramAnchorId: undefined,
      nodeId: nodeContextMenu.nodeId,
      currentUnitId: unit?.id,
    });
  }, [nodeContextMenu, unit?.id]);

  const handleNodeMenuAction = useCallback(
    (action: DiagramContextAction) => {
      if (!nodeContextMenu) return;
      const { nodeId, graph } = nodeContextMenu;
      setNodeContextMenu(null);
      if (action !== 'openInList') return;
      const path = resolveOpenInListTarget(graph, nodeId, unit?.id ?? '');
      if (path !== null) navigate(path);
    },
    [nodeContextMenu, unit?.id, navigate],
  );

  const pageTitle =
    centerUnitId !== null
      ? `Связи юнитов · юнит ${unitNameById(mainGraph, centerUnitId)}`
      : 'Связи юнитов';

  const overviewHoverPainted = useMemo(() => {
    const path = hoveredNodeId
      ? collectHoverPathIds(hoveredNodeId, nodes, edges, 'cross-unit')
      : null;
    const painted = applyHoverPathHighlight(nodes, edges, path);
    return {
      nodes: painted.nodes,
      edges: prepareDependsOnCanvasEdges(painted.edges),
    };
  }, [hoveredNodeId, nodes, edges]);

  const preparedDetailEdges = useMemo(
    () => prepareDependsOnCanvasEdges(detailEdges),
    [detailEdges],
  );

  const onOverviewNodeMouseEnter = useCallback((_event: ReactMouseEvent, node: ViewNode) => {
    setHoveredNodeId(node.id);
  }, []);

  const onOverviewNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  return (
    <div className="diagram-page">
      <div className="diagram-page__header">
        <h1>{pageTitle}</h1>
      </div>

      {centerUnitId === null ? (
        <div className="diagram-empty-state">
          <p>Выберите или создайте юнит.</p>
          <p>
            <Link to="/units">Перейти к списку юнитов</Link>
          </p>
        </div>
      ) : (
        <div className="content-diagram">
          <DiagramLegendShell>
            <DiagramScopeTabs
              active="cross-unit"
              unitId={centerUnitId ?? routeUnitId ?? ''}
            />
            {bridge ? (
              <CrossUnitBridgeLegend
                teamsVisible={bridgeTeamsVisible}
                onTeamsVisibleChange={onBridgeTeamsVisibleChange}
                codeOnly={bridgeCodeOnly}
                onCodeOnlyChange={onBridgeCodeOnlyChange}
              />
            ) : null}
          </DiagramLegendShell>
          <div className="diagram-container diagram-container--cross-unit-main">
            <DiagramCanvas
              nodes={overviewHoverPainted.nodes}
              edges={overviewHoverPainted.edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onEdgeClick={onEdgeClick}
              onNodeMouseEnter={onOverviewNodeMouseEnter}
              onNodeMouseLeave={onOverviewNodeMouseLeave}
              onNodeContextMenu={onOverviewNodeContextMenu}
              fitView
              onLayout={(direction) => void onOverviewLayout(direction)}
              mermaidNodes={nodes}
              mermaidEdges={edges}
              getMermaidDirection={() => overviewLayoutDirectionRef.current}
            />
            {bridge ? (
              <div
                className="cross-unit-bridge-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cross-unit-bridge-overlay-title"
              >
                <div className="cross-unit-bridge-overlay__top">
                  <h2
                    className="cross-unit-bridge-overlay__title"
                    id="cross-unit-bridge-overlay-title"
                  >
                    {unitNameById(mainGraph, bridge[0])} ↔ {unitNameById(mainGraph, bridge[1])}
                  </h2>
                  <Button
                    htmlType="button"
                    type="text"
                    onClick={closeBridgeOverlay}
                    aria-label="Закрыть детализацию"
                  >
                    ×
                  </Button>
                </div>
                <div className="cross-unit-bridge-overlay__flow">
                  <DiagramCanvas
                    nodes={detailNodes}
                    edges={preparedDetailEdges}
                    onNodesChange={onDetailNodesChange}
                    onEdgesChange={onDetailEdgesChange}
                    onNodeContextMenu={onDetailNodeContextMenu}
                    fitView
                    showMiniMap={false}
                    onLayout={(direction) => void onBridgeLayout(direction)}
                    mermaidNodes={detailNodes}
                    mermaidEdges={detailEdges}
                    getMermaidDirection={() => bridgeLayoutDirectionRef.current}
                  />
                </div>
              </div>
            ) : null}
            <DiagramContextMenu
              open={!!nodeContextMenu && nodeMenuItems.length > 0}
              position={nodeContextMenu}
              items={nodeMenuItems}
              onDismiss={() => setNodeContextMenu(null)}
              onAction={handleNodeMenuAction}
            />
          </div>
        </div>
      )}
    </div>
  );
}
