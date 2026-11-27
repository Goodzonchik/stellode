/**
 * @jest-environment jsdom
 */
import { useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { VersionStatus, type ArchitectureGraph, type ViewEdge, type ViewNode } from '@stellode/models';
import { diagramsApi } from '../../api/diagrams-api';
import { featureVersionsApi } from '../../api/feature-versions-api';
import type { FlatDiagram } from './flat-diagram';
import { layoutFeatureVersionCompareDiagram } from './layout-feature-version-compare-diagram';
import { projectLoadedDiagram } from './project-loaded-diagram';
import { useDiagramFilters, type DiagramEntity, type DiagramFilters } from './useDiagramFilters';
import { useDiagramLoad, type DiagramLoad } from './useDiagramLoad';

const mockShowToast = jest.fn();

jest.mock('../../hooks/useToast', () => ({
  ToastVariant: { Success: 'success', Warning: 'warning', Error: 'error' },
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@xyflow/react', () => {
  const react: typeof import('react') = jest.requireActual('react');
  const useListState = <T,>(initial: T[]) => {
    const [value, setValue] = react.useState(initial);
    return [value, setValue, jest.fn()] as const;
  };
  return { useNodesState: useListState, useEdgesState: useListState };
});

jest.mock('../../api/diagrams-api', () => ({
  diagramsApi: { get: jest.fn(), featureVersion: jest.fn() },
}));

jest.mock('../../api/feature-versions-api', () => ({
  featureVersionsApi: { list: jest.fn() },
}));

jest.mock('./parent-feature-element-id-from-graph', () => ({
  parentFeatureElementIdFromGraph: (): string => 'feature-1',
}));

jest.mock('./project-loaded-diagram', () => ({
  projectLoadedDiagram: jest.fn(),
  styleAnomalyEdges: (edges: ViewEdge[]): ViewEdge[] => edges,
}));

jest.mock('./build-feature-version-compare-base', () => ({
  buildFeatureVersionCompareBase: () => ({
    flat: { nodes: [], edges: [] },
    diff: { added: [], removed: [] },
  }),
  buildFeatureVersionFlatBase: () => ({ nodes: [], edges: [] }),
}));

jest.mock('./build-feature-version-composition-table', () => ({
  buildFeatureVersionCompositionTable: () => null,
}));

jest.mock('./layout-visible-diagram', () => ({
  layoutVisibleDiagram: jest.fn(
    async (nodes: ViewNode[], edges: ViewEdge[]): Promise<FlatDiagram> => ({ nodes, edges }),
  ),
}));
jest.mock('./layout-unit-diagram', () => ({
  layoutUnitDiagram: jest.fn(
    async (nodes: ViewNode[], edges: ViewEdge[]): Promise<FlatDiagram> => ({ nodes, edges }),
  ),
}));
jest.mock('./layout-diagram', () => ({
  getLayoutedElements: jest.fn(
    async (nodes: ViewNode[], edges: ViewEdge[]): Promise<FlatDiagram> => ({ nodes, edges }),
  ),
}));
jest.mock('./layout-feature-version-diagram', () => ({
  layoutFeatureVersionDiagram: jest.fn(
    async (nodes: ViewNode[], edges: ViewEdge[]): Promise<FlatDiagram> => ({ nodes, edges }),
  ),
}));
jest.mock('./layout-feature-version-compare-diagram', () => ({
  layoutFeatureVersionCompareDiagram: jest.fn(
    async (nodes: ViewNode[], edges: ViewEdge[]): Promise<FlatDiagram> => ({ nodes, edges }),
  ),
}));

type HarnessProps = { readonly entity: DiagramEntity; readonly diagramAnchorId: string };

type Harness = {
  readonly filters: DiagramFilters;
  readonly load: DiagramLoad;
  readonly archGraph: ArchitectureGraph | null;
};

const emptySearchParams = new URLSearchParams();

const useHarness = ({ entity, diagramAnchorId }: HarnessProps): Harness => {
  const [archGraph, setArchGraph] = useState<ArchitectureGraph | null>(null);
  const filters = useDiagramFilters({ entity, diagramAnchorId, archGraph });
  const load = useDiagramLoad({
    entity,
    diagramAnchorId,
    pathname: `/diagram/${diagramAnchorId}`,
    searchParams: emptySearchParams,
    unitId: 'home-unit',
    showToast: mockShowToast,
    archGraph,
    setArchGraph,
    filters,
  });
  return { filters, load, archGraph };
};

const renderHarness = (initial: HarnessProps) =>
  renderHook((props: HarnessProps) => useHarness(props), { initialProps: initial });

const viewNode = (id: string): ViewNode => ({
  id,
  type: 'default',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: 'Component' },
});

const graph: ArchitectureGraph = { nodes: [], relationships: [] };

const getDiagram = jest.mocked(diagramsApi.get);
const getFeatureVersionDiagram = jest.mocked(diagramsApi.featureVersion);
const listFeatureVersions = jest.mocked(featureVersionsApi.list);
const projectLoaded = jest.mocked(projectLoadedDiagram);
const layoutCompare = jest.mocked(layoutFeatureVersionCompareDiagram);

describe('useDiagramLoad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDiagram.mockResolvedValue(graph);
    listFeatureVersions.mockResolvedValue([]);
    projectLoaded.mockReturnValue({
      flat: { nodes: [viewNode('n1')], edges: [] },
      mode: 'draft',
    });
  });

  it('loads the diagram, stores the graph and lays out nodes', async () => {
    const { result } = renderHarness({ entity: 'service', diagramAnchorId: 's-1' });

    await waitFor(() => {
      expect(result.current.load.nodes).toHaveLength(1);
    });

    expect(getDiagram).toHaveBeenCalledTimes(1);
    expect(result.current.archGraph).toBe(graph);
    expect(result.current.load.meta).not.toBeNull();
    expect(result.current.load.lastImpactModeRef.current).toBe('draft');
  });

  it('applies impact highlight flags to loaded nodes', async () => {
    const { result } = renderHarness({ entity: 'service', diagramAnchorId: 's-1' });
    await waitFor(() => {
      expect(result.current.load.nodes).toHaveLength(1);
    });

    act(() => {
      result.current.load.setImpactHighlightIds(new Set(['n1']));
    });

    expect(result.current.load.nodes[0]?.data.impactHighlighted).toBe(true);
  });

  it('toasts load errors', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    getDiagram.mockRejectedValue(new Error('boom'));

    renderHarness({ entity: 'service', diagramAnchorId: 's-1' });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('boom', 'error');
    });
    consoleError.mockRestore();
  });

  it('resets route filters before reloading another anchor', async () => {
    const { result, rerender } = renderHarness({ entity: 'team', diagramAnchorId: 't-1' });
    await waitFor(() => {
      expect(getDiagram).toHaveBeenCalledTimes(1);
    });
    act(() => {
      result.current.filters.handleTeamCodeOnlyChange(true);
    });

    rerender({ entity: 'team', diagramAnchorId: 't-2' });

    await waitFor(() => {
      expect(getDiagram).toHaveBeenCalledTimes(2);
    });
    expect(result.current.filters.teamCodeOnly).toBe(false);
  });

  it('enables feature version compare through applyCompare', async () => {
    listFeatureVersions.mockResolvedValue([
      { id: 'fv-1', version: '2', status: VersionStatus.Draft, inheritedFromId: 'fv-0' },
      { id: 'fv-0', version: '1', status: VersionStatus.Active },
    ]);
    getFeatureVersionDiagram.mockResolvedValue(graph);
    const { result } = renderHarness({ entity: 'feature-version', diagramAnchorId: 'fv-1' });
    await waitFor(() => {
      expect(result.current.filters.featureVersionCompareAvailable).toBe(true);
    });

    await act(async () => {
      await result.current.filters.handleFeatureVersionCompareEnabledChange(
        true,
        result.current.load.applyCompare,
      );
    });

    expect(getFeatureVersionDiagram).toHaveBeenCalledWith('fv-0');
    expect(layoutCompare).toHaveBeenCalled();
    expect(result.current.filters.featureVersionCompareEnabled).toBe(true);
    expect(result.current.filters.isFeatureVersionDiagramReadOnly).toBe(true);
  });

  it('turns compare off and toasts when the previous version fails to load', async () => {
    listFeatureVersions.mockResolvedValue([
      { id: 'fv-1', version: '2', status: VersionStatus.Draft, inheritedFromId: 'fv-0' },
    ]);
    getFeatureVersionDiagram.mockRejectedValue(new Error('no previous'));
    const { result } = renderHarness({ entity: 'feature-version', diagramAnchorId: 'fv-1' });
    await waitFor(() => {
      expect(result.current.filters.featureVersionCompareAvailable).toBe(true);
    });

    await act(async () => {
      await result.current.load.applyCompare(true);
    });

    expect(result.current.filters.featureVersionCompareEnabled).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('no previous', 'error');
  });
});
