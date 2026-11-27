/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { VersionStatus, type ArchitectureGraph } from '@stellode/models';
import { featureVersionsApi } from '../../api/feature-versions-api';
import type { FeatureVersionLegendRow } from './feature-version-legend-row';
import { UnitDiagramNodeKind } from './unit-diagram-type-visibility';
import { useDiagramFilters, type UseDiagramFiltersParams } from './useDiagramFilters';

jest.mock('../../api/feature-versions-api', () => ({
  featureVersionsApi: { list: jest.fn() },
}));

jest.mock('./parent-feature-element-id-from-graph', () => ({
  parentFeatureElementIdFromGraph: (): string => 'feature-1',
}));

const listFeatureVersions = featureVersionsApi.list as jest.MockedFunction<
  typeof featureVersionsApi.list
>;

const emptyGraph: ArchitectureGraph = { nodes: [], relationships: [] };

const legendRows: FeatureVersionLegendRow[] = [
  { id: 'fv-0', version: '1', versionNumber: 1, status: VersionStatus.Active },
  { id: 'fv-old', version: '0', versionNumber: 0, status: VersionStatus.Deprecated },
  {
    id: 'fv-1',
    version: '2',
    versionNumber: 2,
    status: VersionStatus.Draft,
    inheritedFromId: 'fv-0',
  },
];

const renderFilters = (initial: UseDiagramFiltersParams) =>
  renderHook((params: UseDiagramFiltersParams) => useDiagramFilters(params), {
    initialProps: initial,
  });

describe('useDiagramFilters', () => {
  beforeEach(() => {
    listFeatureVersions.mockReset();
    listFeatureVersions.mockResolvedValue([]);
  });

  it('resets team code-only filter only when the team anchor changes', () => {
    const { result } = renderFilters({ entity: 'team', diagramAnchorId: 't-1', archGraph: null });

    act(() => {
      result.current.resetFiltersForRoute('team', 't-1');
      result.current.handleTeamCodeOnlyChange(true);
    });
    act(() => {
      result.current.resetFiltersForRoute('team', 't-1');
    });
    expect(result.current.teamCodeOnly).toBe(true);
    expect(result.current.teamCodeOnlyRef.current).toBe(true);

    act(() => {
      result.current.resetFiltersForRoute('team', 't-2');
    });
    expect(result.current.teamCodeOnly).toBe(false);
    expect(result.current.teamCodeOnlyRef.current).toBe(false);
  });

  it('resets component visibility for a new component anchor', () => {
    const { result } = renderFilters({
      entity: 'component',
      diagramAnchorId: 'c-1',
      archGraph: null,
    });

    act(() => {
      result.current.handleComponentTypeVisibilityChange(UnitDiagramNodeKind.App, false);
    });
    expect(result.current.componentNodeVisibility[UnitDiagramNodeKind.App]).toBe(false);

    act(() => {
      result.current.resetFiltersForRoute('component', 'c-1');
    });
    expect(result.current.componentNodeVisibility[UnitDiagramNodeKind.App]).toBe(true);
  });

  it('reports compare reset for non feature-version routes and first feature-version anchor', () => {
    const { result } = renderFilters({
      entity: 'feature-version',
      diagramAnchorId: 'fv-1',
      archGraph: null,
    });

    let firstAnchorReset = false;
    act(() => {
      firstAnchorReset = result.current.resetFiltersForRoute('feature-version', 'fv-1');
      result.current.handleFeatureVersionCrossUnitLinksVisibleChange(true);
      result.current.setFeatureVersionCompareEnabledSynced(true);
    });
    expect(firstAnchorReset).toBe(true);

    let switchAnchorReset = true;
    act(() => {
      switchAnchorReset = result.current.resetFiltersForRoute('feature-version', 'fv-2');
    });
    expect(switchAnchorReset).toBe(false);
    expect(result.current.featureVersionCrossUnitLinksVisible).toBe(true);
    expect(result.current.featureVersionCompareEnabled).toBe(true);

    let leaveReset = false;
    act(() => {
      leaveReset = result.current.resetFiltersForRoute('unit', 'u-1');
    });
    expect(leaveReset).toBe(true);
    expect(result.current.featureVersionCrossUnitLinksVisible).toBe(false);
    expect(result.current.featureVersionCompareEnabled).toBe(false);
    expect(result.current.featureVersionCompareEnabledRef.current).toBe(false);
  });

  it('forces teams visible when switching to the table view', () => {
    const { result } = renderFilters({
      entity: 'feature-version',
      diagramAnchorId: 'fv-1',
      archGraph: null,
    });

    act(() => {
      result.current.handleFeatureVersionTeamsVisibleChange(false);
    });
    act(() => {
      result.current.handleFeatureVersionTableViewChange(true);
    });

    expect(result.current.featureVersionTableView).toBe(true);
    expect(result.current.featureVersionTeamsVisible).toBe(true);
    expect(result.current.featureVersionTeamsVisibleRef.current).toBe(true);
  });

  it('delegates compare toggle to applyCompare', async () => {
    const applyCompare = jest.fn(async (): Promise<void> => undefined);
    const { result } = renderFilters({
      entity: 'feature-version',
      diagramAnchorId: 'fv-1',
      archGraph: null,
    });

    await act(async () => {
      await result.current.handleFeatureVersionCompareEnabledChange(true, applyCompare);
    });

    expect(applyCompare).toHaveBeenCalledWith(true);
  });

  it('loads and sorts feature version legend rows and derives compare source', async () => {
    listFeatureVersions.mockResolvedValue(legendRows);
    const { result } = renderFilters({
      entity: 'feature-version',
      diagramAnchorId: 'fv-1',
      archGraph: emptyGraph,
    });

    await waitFor(() => {
      expect(result.current.sortedFeatureLegendRows).toHaveLength(3);
    });

    expect(listFeatureVersions).toHaveBeenCalledWith('feature-1');
    expect(result.current.sortedFeatureLegendRows.map((row) => row.id)).toEqual([
      'fv-1',
      'fv-0',
      'fv-old',
    ]);
    expect(result.current.featureVersionCompareInheritedFromId).toBe('fv-0');
    expect(result.current.featureVersionCompareInheritedFromIdRef.current).toBe('fv-0');
    expect(result.current.featureVersionCompareAvailable).toBe(true);
    expect(result.current.featureVersionLayoutIdsRef.current).toEqual(['fv-1', 'fv-0']);
  });

  it('skips the legend request outside feature-version diagrams', () => {
    const { result } = renderFilters({ entity: 'unit', diagramAnchorId: 'u-1', archGraph: emptyGraph });

    expect(listFeatureVersions).not.toHaveBeenCalled();
    expect(result.current.featureVersionCompareAvailable).toBe(false);
  });

  it('marks the feature-version diagram read-only while comparing', () => {
    const { result } = renderFilters({
      entity: 'feature-version',
      diagramAnchorId: 'fv-1',
      archGraph: null,
    });
    expect(result.current.isFeatureVersionDiagramReadOnly).toBe(false);

    act(() => {
      result.current.setFeatureVersionCompareEnabledSynced(true);
    });

    expect(result.current.isFeatureVersionDiagramReadOnly).toBe(true);
  });
});
