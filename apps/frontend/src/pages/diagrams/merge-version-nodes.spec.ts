import type { ViewEdge, ViewNode } from '@stellode/models';
import { mergeVersionNodes } from './merge-version-nodes';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';

const viewNode = (id: string, data: ViewNode['data']): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data,
});

describe('mergeVersionNodes', () => {
  it('does not throw when HAS_VERSION references missing version vertex', () => {
    const comp = viewNode('c1', { label: 'C', type: 'component' });
    const nodes: ViewNode[] = [comp];
    const edges: ViewEdge[] = [
      {
        id: 'e1',
        source: 'c1',
        target: 'missing-cv',
        type: 'default',
        relationshipType: 'HAS_VERSION',
      },
    ];
    expect(() => mergeVersionNodes(nodes, edges)).not.toThrow();
    const { nodes: out } = mergeVersionNodes(nodes, edges);
    expect(out.some((n) => n.id === 'c1')).toBe(true);
  });

  it('copies ApplicationVersion.actualVersion onto Application via HAS_VERSION', () => {
    const nodes: ViewNode[] = [
      viewNode('app', { label: 'FrontApp', type: 'app' }),
      viewNode('av', {
        label: 'FrontApp',
        type: 'applicationVersion',
        actualVersion: '1.0.0',
        actualVersionNumber: 0,
      }),
    ];
    const edges: ViewEdge[] = [
      {
        id: 'hv',
        source: 'app',
        target: 'av',
        type: 'default',
        relationshipType: 'HAS_VERSION',
      },
    ];
    const { nodes: out } = mergeVersionNodes(nodes, edges, {
      mergedNodeTypes: ['applicationVersion'],
      relationshipRoles: { HAS_VERSION: 'active', HAS_DRAFT: 'draft' },
    });
    expect(out.some((n) => n.id === 'av')).toBe(false);
    const app = out.find((n) => n.id === 'app');
    expect(app?.data.actualVersion).toBe('1.0.0');
    expect(app?.data.actualVersionNumber).toBe(0);
  });

  it('after CV projection keeps App→AV HAS_VERSION so merge fills Application header version', () => {
    const nodes: ViewNode[] = [
      viewNode('c', { label: 'Auth', type: 'component' }),
      viewNode('cv', { label: 'cv', type: 'componentVersion', actualVersion: '1.0.0' }),
      viewNode('app', { label: 'FrontApp', type: 'app' }),
      viewNode('av', {
        label: 'FrontApp',
        type: 'applicationVersion',
        actualVersion: '2.0.0',
        actualVersionNumber: 2,
      }),
    ];
    const edges: ViewEdge[] = [
      {
        id: 'hc',
        source: 'c',
        target: 'cv',
        type: 'default',
        relationshipType: 'HAS_VERSION',
      },
      {
        id: 'ha',
        source: 'app',
        target: 'av',
        type: 'default',
        relationshipType: 'HAS_VERSION',
      },
    ];
    const projected = projectComponentVersionsToComponents(nodes, edges);
    const { nodes: out } = mergeVersionNodes(projected.nodes, projected.edges, {
      mergedNodeTypes: ['applicationVersion'],
      relationshipRoles: { HAS_VERSION: 'active', HAS_DRAFT: 'draft' },
    });
    expect(out.find((n) => n.id === 'app')?.data.actualVersion).toBe('2.0.0');
    expect(out.some((n) => n.id === 'av')).toBe(false);
  });

  it('preserves parent actualVersion when no active child is attached', () => {
    const comp = viewNode('c1', {
      label: 'C',
      type: 'component',
      actualVersion: '1.0',
      actualVersionNumber: 1,
    });
    const { nodes: out } = mergeVersionNodes([comp], []);
    expect(out[0]?.data.actualVersion).toBe('1.0');
    expect(out[0]?.data.actualVersionNumber).toBe(1);
  });

  const edge = (
    id: string,
    source: string,
    target: string,
    relationshipType: string,
    extra: Partial<ViewEdge> = {},
  ): ViewEdge => ({ id, source, target, type: 'default', relationshipType, ...extra });

  it('keeps USES_COMPONENT_VERSION edges with different applicationId after merge', () => {
    const nodes: ViewNode[] = [
      viewNode('f', { label: 'F', type: 'feature' }),
      viewNode('fv', { label: 'FV', type: 'featureVersion' }),
      viewNode('c', { label: 'C', type: 'component' }),
      viewNode('cv', { label: 'CV', type: 'componentVersion' }),
    ];
    const edges: ViewEdge[] = [
      edge('e1', 'f', 'fv', 'HAS_VERSION'),
      edge('e2', 'c', 'cv', 'HAS_VERSION'),
      edge('e3', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app-a' }),
      edge('e4', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app-b' }),
    ];
    const { edges: out } = mergeVersionNodes(nodes, edges);
    const uses = out.filter((e) => e.relationshipType === 'USES_COMPONENT_VERSION');
    expect(uses.map((e) => e.applicationId).sort()).toEqual(['app-a', 'app-b']);
    expect(new Set(uses.map((e) => e.id)).size).toBe(2);
  });

  it('prefers active status when HAS_COMPONENT edges collapse into one', () => {
    const nodes: ViewNode[] = [
      viewNode('app', { label: 'A', type: 'app' }),
      viewNode('av', { label: 'AV', type: 'applicationVersion' }),
      viewNode('c', { label: 'C', type: 'component' }),
      viewNode('cv1', { label: 'CV1', type: 'componentVersion' }),
      viewNode('cv2', { label: 'CV2', type: 'componentVersion' }),
    ];
    const edges: ViewEdge[] = [
      edge('e1', 'app', 'av', 'HAS_VERSION'),
      edge('e2', 'c', 'cv1', 'HAS_VERSION'),
      edge('e3', 'c', 'cv2', 'HAS_VERSION'),
      edge('e4', 'av', 'cv1', 'HAS_COMPONENT', { status: 'deprecated' }),
      edge('e5', 'av', 'cv2', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const { edges: out } = mergeVersionNodes(nodes, edges);
    const hasComponent = out.filter((e) => e.relationshipType === 'HAS_COMPONENT');
    expect(hasComponent).toHaveLength(1);
    expect(hasComponent[0]?.status).toBe('active');
  });
});
