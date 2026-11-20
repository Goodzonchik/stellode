import type { ViewEdge, ViewNode } from '@stellode/models';
import { filterUnitCurrentComposition } from './filter-unit-current-composition';
import { filterUnitDiagramCanvas } from './filter-unit-diagram-canvas';
import { groupNodesByApplication } from './group-nodes-by-application';
import { overviewVersionMergeConfig, mergeVersionNodes } from './merge-version-nodes';
import { projectUnitOverviewDiagram } from './project-unit-overview-diagram';

const viewNode = (
  id: string,
  type: string,
  extra: Partial<ViewNode['data']> = {},
): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type, ...extra },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
  extra: Partial<ViewEdge> = {},
): ViewEdge => ({ id, source, target, type: 'default', relationshipType, ...extra });

const byId = (nodes: ViewNode[], id: string): ViewNode | undefined =>
  nodes.find((node) => node.id === id);

const layoutUnitCanvas = (
  nodes: ViewNode[],
  edges: ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const projected = projectUnitOverviewDiagram(nodes, edges);
  const filtered = filterUnitCurrentComposition(projected.nodes, projected.edges);
  const merged = mergeVersionNodes(
    filtered.nodes,
    filtered.edges,
    overviewVersionMergeConfig,
  );
  const grouped = groupNodesByApplication(merged.nodes, merged.edges);
  return filterUnitDiagramCanvas(grouped.nodes, grouped.edges);
};

describe('unit diagram Application nesting', () => {
  it('nests overview Component inside Application and keeps MAINTAINS to the copy', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('team', 'team'),
      viewNode('comp', 'component'),
      viewNode('cv', 'componentVersion'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('ht', 'unit', 'team', 'HAS_TEAM'),
      edge('m', 'team', 'comp', 'MAINTAINS'),
      edge('hv-c', 'comp', 'cv', 'HAS_VERSION'),
      edge('owns', 'unit', 'app', 'OWNS'),
      edge('hv-a', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'cv', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = layoutUnitCanvas(nodes, edges);
    expect(byId(out.nodes, 'unit')).toBeUndefined();
    expect(byId(out.nodes, 'cv')).toBeUndefined();
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    const copy = byId(out.nodes, 'app::comp');
    expect(copy?.parentId).toBe('app');
    expect(copy?.data.sourceId).toBe('comp');
    expect(copy?.data.type).toBe('component');
    expect(out.edges.some((e) => e.relationshipType === 'OWNS')).toBe(false);
    const maintains = out.edges.filter((e) => e.relationshipType === 'MAINTAINS');
    expect(maintains).toHaveLength(1);
    expect(maintains[0]?.source).toBe('team');
    expect(maintains[0]?.target).toBe('app::comp');
  });

  it('collapses two CVs of one Component into one overview node in the app', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('team', 'team'),
      viewNode('comp', 'component'),
      viewNode('cv1', 'componentVersion'),
      viewNode('cv2', 'componentVersion'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('ht', 'unit', 'team', 'HAS_TEAM'),
      edge('m', 'team', 'comp', 'MAINTAINS'),
      edge('hv1', 'comp', 'cv1', 'HAS_VERSION'),
      edge('hv2', 'comp', 'cv2', 'HAS_VERSION'),
      edge('owns', 'unit', 'app', 'OWNS'),
      edge('hv-a', 'app', 'av', 'HAS_VERSION'),
      edge('hc1', 'av', 'cv1', 'HAS_COMPONENT', { status: 'active' }),
      edge('hc2', 'av', 'cv2', 'HAS_COMPONENT', { status: 'deprecated' }),
    ];
    const out = layoutUnitCanvas(nodes, edges);
    expect(byId(out.nodes, 'app::comp')?.parentId).toBe('app');
    expect(byId(out.nodes, 'app::cv1')).toBeUndefined();
    expect(byId(out.nodes, 'app::cv2')).toBeUndefined();
  });

  it('removes Component when it is not in any current Application', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('team', 'team'),
      viewNode('comp', 'component'),
      viewNode('app', 'app'),
    ];
    const edges = [
      edge('ht', 'unit', 'team', 'HAS_TEAM'),
      edge('m', 'team', 'comp', 'MAINTAINS'),
      edge('owns', 'unit', 'app', 'OWNS'),
    ];
    const out = layoutUnitCanvas(nodes, edges);
    expect(byId(out.nodes, 'unit')).toBeUndefined();
    expect(byId(out.nodes, 'comp')).toBeUndefined();
    expect(byId(out.nodes, 'app')).toBeUndefined();
    expect(out.edges.find((e) => e.relationshipType === 'MAINTAINS')).toBeUndefined();
  });

  it('does not keep Application or Component via USES.applicationId without HAS_COMPONENT', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('team', 'team'),
      viewNode('feat', 'feature'),
      viewNode('fv', 'featureVersion'),
      viewNode('comp', 'component'),
      viewNode('cv', 'componentVersion'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('ht', 'unit', 'team', 'HAS_TEAM'),
      edge('m', 'team', 'comp', 'MAINTAINS'),
      edge('hf', 'feat', 'fv', 'HAS_VERSION'),
      edge('hv-c', 'comp', 'cv', 'HAS_VERSION'),
      edge('uses', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
      edge('owns', 'unit', 'app', 'OWNS'),
      edge('hv-a', 'app', 'av', 'HAS_VERSION'),
    ];
    const out = layoutUnitCanvas(nodes, edges);
    expect(byId(out.nodes, 'comp')).toBeUndefined();
    expect(byId(out.nodes, 'app')).toBeUndefined();
    expect(byId(out.nodes, 'app::comp')).toBeUndefined();
  });

  it('draws USES from Feature to overview Component copy by applicationId', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('team', 'team'),
      viewNode('feat', 'feature'),
      viewNode('fv', 'featureVersion'),
      viewNode('comp', 'component'),
      viewNode('cv', 'componentVersion'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('ht', 'unit', 'team', 'HAS_TEAM'),
      edge('m', 'team', 'comp', 'MAINTAINS'),
      edge('hf', 'feat', 'fv', 'HAS_VERSION'),
      edge('hv-c', 'comp', 'cv', 'HAS_VERSION'),
      edge('uses', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
      edge('owns', 'unit', 'app', 'OWNS'),
      edge('hv-a', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'cv', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = layoutUnitCanvas(nodes, edges);
    const uses = out.edges.filter((e) => e.label === 'USES' || e.relationshipType === 'USES_COMPONENT_VERSION');
    expect(uses.some((e) => e.source === 'feat' && e.target === 'app::comp')).toBe(true);
  });

  it('nests overview dependency inside Application without leftover CV', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('team', 'team'),
      viewNode('dep', 'dependency', { isDependency: true }),
      viewNode('cv', 'componentVersion'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('ht', 'unit', 'team', 'HAS_TEAM'),
      edge('m', 'team', 'dep', 'MAINTAINS'),
      edge('hv-c', 'dep', 'cv', 'HAS_VERSION'),
      edge('owns', 'unit', 'app', 'OWNS'),
      edge('hv-a', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'cv', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = layoutUnitCanvas(nodes, edges);
    expect(byId(out.nodes, 'cv')).toBeUndefined();
    expect(byId(out.nodes, 'dep')).toBeUndefined();
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    const copy = byId(out.nodes, 'app::dep');
    expect(copy?.parentId).toBe('app');
    expect(copy?.data.type).toBe('dependency');
    expect(copy?.data.isDependency).toBe(true);
  });
});
