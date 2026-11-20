import type { ViewEdge, ViewNode } from '@stellode/models';
import { groupNodesByApplication } from './group-nodes-by-application';

const viewNode = (id: string, type: string, data: Partial<ViewNode['data']> = {}): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type, ...data },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
  extra: Partial<ViewEdge> = {},
): ViewEdge => ({ id, source, target, type: 'default', relationshipType, ...extra });

const byId = (nodes: ViewNode[], id: string): ViewNode | undefined => nodes.find((n) => n.id === id);

describe('groupNodesByApplication', () => {
  it('returns input unchanged when there is no HAS_COMPONENT and no USES with applicationId', () => {
    const nodes = [viewNode('app', 'app'), viewNode('c', 'component')];
    const edges = [edge('e', 'app', 'c', 'OWNS'), edge('u', 'f', 'c', 'USES_COMPONENT_VERSION')];
    const out = groupNodesByApplication(nodes, edges);
    expect(out.nodes).toEqual(nodes);
    expect(out.edges).toEqual(edges);
    expect(byId(out.nodes, 'app')?.type).toBe('custom');
  });

  it('turns Application into a group and nests component copies with parentId', () => {
    const nodes = [viewNode('app', 'app'), viewNode('c', 'component'), viewNode('f', 'feature')];
    const edges = [
      edge('hc', 'app', 'c', 'HAS_COMPONENT', { status: 'active' }),
      edge('u', 'f', 'c', 'USES_COMPONENT_VERSION'),
    ];
    const out = groupNodesByApplication(nodes, edges);
    const app = byId(out.nodes, 'app');
    const copy = byId(out.nodes, 'app::c');
    expect(app?.type).toBe('group');
    expect(copy?.parentId).toBe('app');
    expect(copy?.extent).toBe('parent');
    expect(copy?.data.sourceId).toBe('c');
    expect(copy?.data.applicationId).toBe('app');
    expect(copy?.data.applicationStatus).toBe('active');
    expect(byId(out.nodes, 'c')).toBeUndefined();
    expect(out.edges.some((e) => e.relationshipType === 'HAS_COMPONENT')).toBe(false);
    expect(out.edges.find((e) => e.relationshipType === 'USES_COMPONENT_VERSION')?.target).toBe('app::c');
  });

  it('nests dependency copies inside Application and keeps dependency type', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('dep', 'dependency', { isDependency: true }),
    ];
    const edges = [edge('hc', 'app', 'dep', 'HAS_COMPONENT', { status: 'active' })];
    const out = groupNodesByApplication(nodes, edges);
    const copy = byId(out.nodes, 'app::dep');
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    expect(byId(out.nodes, 'app')?.data.containsDependency).toBe(true);
    expect(copy?.parentId).toBe('app');
    expect(copy?.data.type).toBe('dependency');
    expect(copy?.data.isDependency).toBe(true);
    expect(byId(out.nodes, 'dep')).toBeUndefined();
  });

  it('does not mark Application containsDependency when children are only components', () => {
    const nodes = [viewNode('app', 'app'), viewNode('c', 'component')];
    const edges = [edge('hc', 'app', 'c', 'HAS_COMPONENT', { status: 'active' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app')?.data.containsDependency).toBeUndefined();
  });

  it('marks Application containsDependency when mixed with component and dependency', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('c', 'component'),
      viewNode('dep', 'dependency', { isDependency: true }),
    ];
    const edges = [
      edge('hc1', 'app', 'c', 'HAS_COMPONENT', { status: 'active' }),
      edge('hc2', 'app', 'dep', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app')?.data.containsDependency).toBe(true);
  });

  it('places parents before their children in the output array', () => {
    const nodes = [viewNode('c', 'component'), viewNode('app', 'app')];
    const edges = [edge('hc', 'app', 'c', 'HAS_COMPONENT')];
    const out = groupNodesByApplication(nodes, edges);
    const appIndex = out.nodes.findIndex((n) => n.id === 'app');
    const copyIndex = out.nodes.findIndex((n) => n.id === 'app::c');
    expect(appIndex).toBeLessThan(copyIndex);
  });

  it('duplicates a component that belongs to several applications and fans out edges', () => {
    const nodes = [
      viewNode('a1', 'app'),
      viewNode('a2', 'app'),
      viewNode('c', 'component'),
      viewNode('t', 'team'),
    ];
    const edges = [
      edge('h1', 'a1', 'c', 'HAS_COMPONENT', { status: 'active' }),
      edge('h2', 'a2', 'c', 'HAS_COMPONENT', { status: 'deprecated' }),
      edge('m', 't', 'c', 'MAINTAINS'),
    ];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'a1::c')?.data.applicationStatus).toBe('active');
    expect(byId(out.nodes, 'a2::c')?.data.applicationStatus).toBe('deprecated');
    expect(byId(out.nodes, 'a1::c')?.data.duplicate).toBe(true);
    expect(byId(out.nodes, 'a2::c')?.data.duplicate).toBe(true);
    const maintains = out.edges.filter((e) => e.relationshipType === 'MAINTAINS');
    expect(maintains.map((e) => e.target).sort()).toEqual(['a1::c', 'a2::c']);
    expect(new Set(maintains.map((e) => e.id)).size).toBe(2);
  });

  it('does not set duplicate when component belongs to a single application', () => {
    const nodes = [viewNode('app', 'app'), viewNode('c', 'component')];
    const edges = [edge('hc', 'app', 'c', 'HAS_COMPONENT', { status: 'active' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app::c')?.data.duplicate).toBeUndefined();
  });

  it('routes USES_COMPONENT_VERSION with applicationId only into the matching copy', () => {
    const nodes = [viewNode('a1', 'app'), viewNode('a2', 'app'), viewNode('cv', 'componentVersion'), viewNode('fv', 'featureVersion')];
    const edges = [
      edge('h1', 'a1', 'cv', 'HAS_COMPONENT'),
      edge('h2', 'a2', 'cv', 'HAS_COMPONENT'),
      edge('u', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'a2' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    const uses = out.edges.filter((e) => e.relationshipType === 'USES_COMPONENT_VERSION');
    expect(uses.map((e) => e.target)).toEqual(['a2::cv']);
  });

  it('falls back to all copies when applicationId does not match any container', () => {
    const nodes = [viewNode('a1', 'app'), viewNode('a2', 'app'), viewNode('cv', 'componentVersion'), viewNode('fv', 'featureVersion')];
    const edges = [
      edge('h1', 'a1', 'cv', 'HAS_COMPONENT'),
      edge('h2', 'a2', 'cv', 'HAS_COMPONENT'),
      edge('u', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'other' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    const uses = out.edges.filter((e) => e.relationshipType === 'USES_COMPONENT_VERSION');
    expect(uses.map((e) => e.target).sort()).toEqual(['a1::cv', 'a2::cv']);
  });

  it('collapses ApplicationVersion into Application and carries its version', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { actualVersion: '3', actualVersionNumber: 3, status: 'current' }),
      viewNode('cv', 'componentVersion'),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'cv', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'av')).toBeUndefined();
    const app = byId(out.nodes, 'app');
    expect(app?.type).toBe('group');
    expect(app?.data.actualVersion).toBe('3');
    expect(app?.data.actualVersionNumber).toBe(3);
    expect(byId(out.nodes, 'app::cv')?.parentId).toBe('app');
    expect(out.edges.some((e) => e.source === 'av' || e.target === 'av')).toBe(false);
    expect(out.edges.some((e) => e.relationshipType === 'HAS_VERSION')).toBe(false);
  });

  it('collapses ApplicationVersion into Application header when children come only from USES', () => {
    const nodes = [
      viewNode('app', 'app', { label: 'FrontApp' }),
      viewNode('av', 'applicationVersion', { actualVersion: '1.0.0', actualVersionNumber: 1 }),
      viewNode('c', 'component', { label: 'Auth', actualVersion: '2.0.0' }),
      viewNode('fv', 'featureVersion'),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('u', 'fv', 'c', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'av')).toBeUndefined();
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    expect(byId(out.nodes, 'app')?.data.actualVersion).toBe('1.0.0');
    expect(byId(out.nodes, 'app::c')?.parentId).toBe('app');
    expect(out.edges.some((e) => e.relationshipType === 'HAS_VERSION')).toBe(false);
  });

  it('hides ApplicationVersion and puts version on Application even without component children', () => {
    const nodes = [
      viewNode('app', 'app', { label: 'FrontApp' }),
      viewNode('av', 'applicationVersion', { actualVersion: '1.2.0', actualVersionNumber: 2 }),
    ];
    const edges = [edge('hv', 'app', 'av', 'HAS_VERSION')];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'av')).toBeUndefined();
    expect(byId(out.nodes, 'app')?.type).toBe('custom');
    expect(byId(out.nodes, 'app')?.data.actualVersion).toBe('1.2.0');
    expect(out.edges).toEqual([]);
  });

  it('keeps Application.actualVersion in group header after ApplicationVersion is removed by merge', () => {
    const nodes = [
      viewNode('app', 'app', {
        label: 'FrontApp',
        actualVersion: '1.0.0',
        actualVersionNumber: 0,
      }),
      viewNode('c', 'component'),
    ];
    const edges = [edge('u', 'fv', 'c', 'USES_COMPONENT_VERSION', { applicationId: 'app' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    expect(byId(out.nodes, 'app')?.data.actualVersion).toBe('1.0.0');
    expect(byId(out.nodes, 'app')?.data.actualVersionNumber).toBe(0);
  });

  it('collapses ApplicationVersion by data.applicationId without HAS_VERSION edge', () => {
    const nodes = [
      viewNode('app', 'app', { label: 'FrontApp' }),
      viewNode('av', 'applicationVersion', {
        actualVersion: '2.0.0',
        actualVersionNumber: 2,
        applicationId: 'app',
      }),
      viewNode('c', 'component'),
    ];
    const edges = [edge('u', 'fv', 'c', 'USES_COMPONENT_VERSION', { applicationId: 'app' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'av')).toBeUndefined();
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    expect(byId(out.nodes, 'app')?.data.actualVersion).toBe('2.0.0');
    expect(byId(out.nodes, 'app::c')?.parentId).toBe('app');
  });

  it('hides orphan ApplicationVersion when Application is not on the diagram', () => {
    const nodes = [
      viewNode('av', 'applicationVersion', { actualVersion: '1.0.0', applicationId: 'missing' }),
      viewNode('c', 'component'),
    ];
    const edges: ViewEdge[] = [];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'av')).toBeUndefined();
    expect(byId(out.nodes, 'c')).toBeDefined();
  });

  it('fans out DEPENDS_ON between two duplicated components', () => {
    const nodes = [viewNode('a1', 'app'), viewNode('a2', 'app'), viewNode('c1', 'component'), viewNode('c2', 'component')];
    const edges = [
      edge('h1', 'a1', 'c1', 'HAS_COMPONENT'),
      edge('h2', 'a2', 'c1', 'HAS_COMPONENT'),
      edge('h3', 'a1', 'c2', 'HAS_COMPONENT'),
      edge('d', 'c1', 'c2', 'DEPENDS_ON'),
    ];
    const out = groupNodesByApplication(nodes, edges);
    const deps = out.edges.filter((e) => e.relationshipType === 'DEPENDS_ON');
    expect(deps.map((e) => `${e.source}>${e.target}`).sort()).toEqual(['a1::c1>a1::c2', 'a2::c1>a1::c2']);
  });

  it('does not mutate inputs', () => {
    const nodes = [viewNode('app', 'app'), viewNode('c', 'component')];
    const edges = [edge('hc', 'app', 'c', 'HAS_COMPONENT')];
    const nodesSnapshot = JSON.stringify(nodes);
    const edgesSnapshot = JSON.stringify(edges);
    groupNodesByApplication(nodes, edges);
    expect(JSON.stringify(nodes)).toBe(nodesSnapshot);
    expect(JSON.stringify(edges)).toBe(edgesSnapshot);
  });

  it('nests ComponentVersion into Application by USES_COMPONENT_VERSION.applicationId without HAS_COMPONENT', () => {
    const nodes = [viewNode('app', 'app'), viewNode('cv', 'componentVersion'), viewNode('fv', 'featureVersion')];
    const edges = [edge('u', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    const copy = byId(out.nodes, 'app::cv');
    expect(copy?.parentId).toBe('app');
    expect(copy?.data.applicationId).toBe('app');
    expect(copy?.data.applicationStatus).toBeUndefined();
    expect(byId(out.nodes, 'cv')).toBeUndefined();
    expect(out.edges.find((e) => e.relationshipType === 'USES_COMPONENT_VERSION')?.target).toBe('app::cv');
  });

  it('creates a copy per applicationId when several USES point to the same ComponentVersion', () => {
    const nodes = [
      viewNode('a1', 'app'),
      viewNode('a2', 'app'),
      viewNode('cv', 'componentVersion'),
      viewNode('fv', 'featureVersion'),
    ];
    const edges = [
      edge('u1', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'a1' }),
      edge('u2', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'a2' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'a1::cv')?.parentId).toBe('a1');
    expect(byId(out.nodes, 'a2::cv')?.parentId).toBe('a2');
    const uses = out.edges.filter((e) => e.relationshipType === 'USES_COMPONENT_VERSION');
    expect(uses.map((e) => e.target).sort()).toEqual(['a1::cv', 'a2::cv']);
  });

  it('keeps HAS_COMPONENT status on the copy when USES.applicationId points to the same application', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion'),
      viewNode('cv', 'componentVersion'),
      viewNode('fv', 'featureVersion'),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'cv', 'HAS_COMPONENT', { status: 'deprecated' }),
      edge('u', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app::cv')?.data.applicationStatus).toBe('deprecated');
    expect(out.nodes.filter((n) => n.data.sourceId === 'cv')).toHaveLength(1);
  });

  it('ignores USES.applicationId whose Application is not present on the diagram', () => {
    const nodes = [viewNode('cv', 'componentVersion'), viewNode('fv', 'featureVersion')];
    const edges = [edge('u', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'missing' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'cv')?.parentId).toBeUndefined();
    expect(out.edges).toEqual(edges);
  });

  it('nests only component when USES is oriented component → featureVersion (layout flip)', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('c', 'component', { label: 'Auth', actualVersion: '1.0.0' }),
      viewNode('fv', 'featureVersion'),
    ];
    const edges = [edge('u', 'c', 'fv', 'USES_COMPONENT_VERSION', { applicationId: 'app' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    expect(byId(out.nodes, 'app::c')?.parentId).toBe('app');
    expect(byId(out.nodes, 'fv')?.parentId).toBeUndefined();
    expect(byId(out.nodes, 'fv')?.type).toBe('custom');
    expect(out.nodes.some((n) => n.id === 'app::fv')).toBe(false);
  });

  it('does not nest Feature when USES is oriented component → feature after merge', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('c', 'component', { label: 'Auth', actualVersion: '1.0.0' }),
      viewNode('f', 'feature'),
    ];
    const edges = [edge('u', 'c', 'f', 'USES_COMPONENT_VERSION', { applicationId: 'app' })];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app::c')?.parentId).toBe('app');
    expect(byId(out.nodes, 'f')?.parentId).toBeUndefined();
    expect(out.nodes.some((n) => n.parentId === 'app' && n.data.sourceId === 'f')).toBe(false);
  });

  it('nests component when HAS_COMPONENT is oriented component → applicationVersion', () => {
    const nodes = [
      viewNode('app', 'app'),
      viewNode('av', 'applicationVersion', { actualVersion: '1.0.0' }),
      viewNode('c', 'component'),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'c', 'av', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'app')?.type).toBe('group');
    expect(byId(out.nodes, 'app::c')?.parentId).toBe('app');
    expect(byId(out.nodes, 'app::c')?.data.applicationStatus).toBe('active');
    expect(byId(out.nodes, 'av')).toBeUndefined();
  });

  it('ignores HAS_COMPONENT whose container is not present on the diagram', () => {
    const nodes = [viewNode('c', 'component')];
    const edges = [edge('hc', 'missing-app', 'c', 'HAS_COMPONENT')];
    const out = groupNodesByApplication(nodes, edges);
    expect(byId(out.nodes, 'c')?.parentId).toBeUndefined();
    expect(out.edges).toEqual(edges);
  });
});
