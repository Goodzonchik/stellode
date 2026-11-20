import type { ViewEdge, ViewNode } from '@stellode/models';
import { filterUnitCurrentComposition } from './filter-unit-current-composition';

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

describe('filterUnitCurrentComposition', () => {
  it('keeps Component inside current Application composition', () => {
    const nodes = [
      viewNode('team', 'team'),
      viewNode('comp', 'component'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('m', 'team', 'comp', 'MAINTAINS'),
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'comp', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(byId(out.nodes, 'comp')).toBeDefined();
    expect(byId(out.nodes, 'app')).toBeDefined();
    expect(byId(out.nodes, 'av')).toBeDefined();
    expect(byId(out.nodes, 'team')).toBeDefined();
  });

  it('hides draft-only Component not in current composition', () => {
    const nodes = [
      viewNode('team', 'team'),
      viewNode('draftComp', 'component'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
      viewNode('comp', 'component'),
    ];
    const edges = [
      edge('m1', 'team', 'draftComp', 'MAINTAINS'),
      edge('m2', 'team', 'comp', 'MAINTAINS'),
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'comp', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(byId(out.nodes, 'draftComp')).toBeUndefined();
    expect(byId(out.nodes, 'comp')).toBeDefined();
  });

  it('hides Application without current version', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('comp', 'component'),
    ];
    const edges = [edge('owns', 'unit', 'app', 'OWNS')];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(byId(out.nodes, 'app')).toBeUndefined();
    expect(byId(out.nodes, 'comp')).toBeUndefined();
  });

  it('hides Application with empty current composition', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
      viewNode('comp', 'component'),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('m', 'team', 'comp', 'MAINTAINS'),
    ];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(byId(out.nodes, 'app')).toBeUndefined();
    expect(byId(out.nodes, 'av')).toBeUndefined();
    expect(byId(out.nodes, 'comp')).toBeUndefined();
  });

  it('does not keep Component via USES.applicationId without HAS_COMPONENT', () => {
    const nodes = [
      viewNode('feat', 'feature'),
      viewNode('comp', 'component'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('uses', 'feat', 'comp', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
    ];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(byId(out.nodes, 'comp')).toBeUndefined();
    expect(byId(out.nodes, 'app')).toBeUndefined();
    expect(byId(out.nodes, 'feat')).toBeDefined();
  });

  it('drops dangling edges to removed nodes', () => {
    const nodes = [
      viewNode('team', 'team'),
      viewNode('orphan', 'component'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
      viewNode('comp', 'component'),
    ];
    const edges = [
      edge('m', 'team', 'orphan', 'MAINTAINS'),
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'comp', 'HAS_COMPONENT', { status: 'deprecated' }),
    ];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(out.edges.find((e) => e.id === 'm')).toBeUndefined();
    expect(out.edges.find((e) => e.id === 'hc')).toBeDefined();
  });

  it('keeps dependency inside current Application composition', () => {
    const nodes = [
      viewNode('team', 'team'),
      viewNode('dep', 'dependency'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
    ];
    const edges = [
      edge('m', 'team', 'dep', 'MAINTAINS'),
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'dep', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(byId(out.nodes, 'dep')).toBeDefined();
    expect(byId(out.nodes, 'app')).toBeDefined();
    expect(byId(out.nodes, 'av')).toBeDefined();
  });

  it('hides dependency not in current composition', () => {
    const nodes = [
      viewNode('orphan', 'dependency'),
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { status: 'current' }),
      viewNode('comp', 'component'),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'comp', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = filterUnitCurrentComposition(nodes, edges);
    expect(byId(out.nodes, 'orphan')).toBeUndefined();
    expect(byId(out.nodes, 'comp')).toBeDefined();
  });
});
