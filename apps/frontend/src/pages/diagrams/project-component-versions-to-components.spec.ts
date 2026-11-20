import type { ViewEdge, ViewNode } from '@stellode/models';
import { captionWithOptionalVersion } from './caption-with-optional-version';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';

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

describe('projectComponentVersionsToComponents', () => {
  it('replaces ComponentVersion with component node keeping CV id and parent name + version', () => {
    const nodes = [
      viewNode('c', 'component', { label: 'Auth' }),
      viewNode('cv', 'componentVersion', {
        label: 'v1',
        actualVersion: '1.0.0',
        actualVersionNumber: 1,
        status: 'active',
      }),
      viewNode('fv', 'featureVersion'),
    ];
    const edges = [
      edge('hv', 'c', 'cv', 'HAS_VERSION'),
      edge('u', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
    ];
    const out = projectComponentVersionsToComponents(nodes, edges);
    const projected = byId(out.nodes, 'cv');
    expect(projected?.data.type).toBe('component');
    expect(projected?.data.label).toBe('Auth');
    expect(projected?.data.actualVersion).toBe('1.0.0');
    expect(projected?.data.status).toBe('active');
    expect(projected?.data.sourceId).toBe('cv');
    expect(captionWithOptionalVersion(projected!.data)).toBe('Auth · 1.0.0');
    expect(byId(out.nodes, 'c')).toBeUndefined();
    expect(out.edges.some((e) => e.relationshipType === 'HAS_VERSION')).toBe(false);
    expect(out.edges.find((e) => e.relationshipType === 'USES_COMPONENT_VERSION')?.target).toBe('cv');
  });

  it('keeps two projected nodes for two versions of the same Component', () => {
    const nodes = [
      viewNode('c', 'component', { label: 'Auth' }),
      viewNode('cv1', 'componentVersion', { actualVersion: '1.0.0' }),
      viewNode('cv2', 'componentVersion', { actualVersion: '2.0.0' }),
    ];
    const edges = [
      edge('h1', 'c', 'cv1', 'HAS_VERSION'),
      edge('h2', 'c', 'cv2', 'HAS_DRAFT'),
    ];
    const out = projectComponentVersionsToComponents(nodes, edges);
    expect(byId(out.nodes, 'cv1')?.data.actualVersion).toBe('1.0.0');
    expect(byId(out.nodes, 'cv2')?.data.actualVersion).toBe('2.0.0');
    expect(byId(out.nodes, 'cv1')?.data.label).toBe('Auth');
    expect(byId(out.nodes, 'cv2')?.data.label).toBe('Auth');
    expect(byId(out.nodes, 'c')).toBeUndefined();
  });

  it('preserves keepComponentIds anchor and fans MAINTAINS onto projected children', () => {
    const nodes = [
      viewNode('c', 'component', { label: 'Auth' }),
      viewNode('cv', 'componentVersion', { actualVersion: '1.0.0' }),
      viewNode('t', 'team'),
    ];
    const edges = [
      edge('hv', 'c', 'cv', 'HAS_VERSION'),
      edge('m', 't', 'c', 'MAINTAINS'),
    ];
    const out = projectComponentVersionsToComponents(nodes, edges, { keepComponentIds: ['c'] });
    expect(byId(out.nodes, 'c')?.data.type).toBe('component');
    expect(byId(out.nodes, 'cv')?.data.type).toBe('component');
    expect(out.edges.filter((e) => e.relationshipType === 'MAINTAINS').map((e) => e.target)).toEqual([
      'c',
      'cv',
    ]);
  });

  it('fans MAINTAINS onto all projected children when parent Component is removed', () => {
    const nodes = [
      viewNode('c', 'component', { label: 'Auth' }),
      viewNode('cv1', 'componentVersion', { actualVersion: '1' }),
      viewNode('cv2', 'componentVersion', { actualVersion: '2' }),
      viewNode('t', 'team'),
    ];
    const edges = [
      edge('h1', 'c', 'cv1', 'HAS_VERSION'),
      edge('h2', 'c', 'cv2', 'HAS_VERSION'),
      edge('m', 't', 'c', 'MAINTAINS'),
    ];
    const out = projectComponentVersionsToComponents(nodes, edges);
    const maintains = out.edges.filter((e) => e.relationshipType === 'MAINTAINS');
    expect(maintains.map((e) => e.target).sort()).toEqual(['cv1', 'cv2']);
    expect(byId(out.nodes, 'c')).toBeUndefined();
  });

  it('leaves ComponentVersion without parent unchanged', () => {
    const nodes = [viewNode('cv', 'componentVersion', { actualVersion: '1' })];
    const edges: ViewEdge[] = [];
    const out = projectComponentVersionsToComponents(nodes, edges);
    expect(byId(out.nodes, 'cv')?.data.type).toBe('componentVersion');
  });

  it('projects CV of dependency parent as dependency type', () => {
    const nodes = [
      viewNode('dep', 'dependency', { label: 'Lib', isDependency: true }),
      viewNode('cv', 'componentVersion', {
        label: 'v1',
        actualVersion: '1.0.0',
        status: 'active',
      }),
    ];
    const edges = [edge('hv', 'dep', 'cv', 'HAS_VERSION')];
    const out = projectComponentVersionsToComponents(nodes, edges);
    const projected = byId(out.nodes, 'cv');
    expect(projected?.data.type).toBe('dependency');
    expect(projected?.data.isDependency).toBe(true);
    expect(projected?.data.label).toBe('Lib');
    expect(byId(out.nodes, 'dep')).toBeUndefined();
  });

  it('keeps Application/Feature HAS_VERSION edges for merge into group header', () => {
    const nodes = [
      viewNode('c', 'component', { label: 'Auth' }),
      viewNode('cv', 'componentVersion', { actualVersion: '1.0.0' }),
      viewNode('app', 'app', { label: 'FrontApp' }),
      viewNode('av', 'applicationVersion', { actualVersion: '2.0.0', actualVersionNumber: 2 }),
      viewNode('f', 'feature', { label: 'Pay' }),
      viewNode('fv', 'featureVersion', { actualVersion: '3.0.0' }),
    ];
    const edges = [
      edge('hc', 'c', 'cv', 'HAS_VERSION'),
      edge('ha', 'app', 'av', 'HAS_VERSION'),
      edge('hf', 'f', 'fv', 'HAS_VERSION'),
      edge('u', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
    ];
    const out = projectComponentVersionsToComponents(nodes, edges);
    expect(out.edges.some((e) => e.id === 'hc')).toBe(false);
    expect(out.edges.find((e) => e.id === 'ha')).toEqual(
      expect.objectContaining({ source: 'app', target: 'av', relationshipType: 'HAS_VERSION' }),
    );
    expect(out.edges.find((e) => e.id === 'hf')).toEqual(
      expect.objectContaining({ source: 'f', target: 'fv', relationshipType: 'HAS_VERSION' }),
    );
  });

  it('does not mutate inputs', () => {
    const nodes = [
      viewNode('c', 'component', { label: 'Auth' }),
      viewNode('cv', 'componentVersion', { actualVersion: '1' }),
    ];
    const edges = [edge('hv', 'c', 'cv', 'HAS_VERSION')];
    const nodesSnap = JSON.stringify(nodes);
    const edgesSnap = JSON.stringify(edges);
    projectComponentVersionsToComponents(nodes, edges);
    expect(JSON.stringify(nodes)).toBe(nodesSnap);
    expect(JSON.stringify(edges)).toBe(edgesSnap);
  });
});
