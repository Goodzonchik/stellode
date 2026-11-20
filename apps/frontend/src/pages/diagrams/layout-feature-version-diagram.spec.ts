import type { ViewEdge, ViewNode } from '@stellode/models';
import { layoutFeatureVersionDiagram } from './layout-feature-version-diagram';

jest.mock('./layout-diagram', () => ({
  getLayoutedElements: async (nodes: ViewNode[], edges: ViewEdge[]) => ({ nodes, edges }),
}));

const node = (id: string, dataType: string, extras: Partial<ViewNode['data']> = {}): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: dataType, ...extras },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
  extras: Partial<ViewEdge> = {},
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
  ...extras,
});

describe('layoutFeatureVersionDiagram', () => {
  it('nests component by USES.applicationId before FeatureVersion is hidden', async () => {
    const nodes = [
      node('fv', 'featureVersion'),
      node('c', 'component', { unitId: 'u1' }),
      node('app', 'app'),
      node('team', 'team'),
      node('unit', 'unit'),
    ];
    const edges = [
      edge('u', 'fv', 'c', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
      edge('m', 'team', 'c', 'MAINTAINS'),
    ];
    const out = await layoutFeatureVersionDiagram(nodes, edges, 'LR');
    const nested = out.nodes.find((n) => n.parentId === 'app');
    expect(nested).toBeDefined();
    expect(nested?.data.type).toBe('component');
    expect(out.nodes.some((n) => n.id === 'fv')).toBe(false);
    expect(out.nodes.some((n) => n.id === 'unit')).toBe(false);
    expect(out.nodes.some((n) => n.id === 'team')).toBe(true);
  });

  it('nests via HAS_COMPONENT when ApplicationVersion collapses', async () => {
    const nodes = [
      node('fv', 'featureVersion'),
      node('c', 'component', { unitId: 'u1' }),
      node('app', 'app'),
      node('av', 'applicationVersion', { actualVersion: '1.0.0' }),
    ];
    const edges = [
      edge('hv', 'app', 'av', 'HAS_VERSION'),
      edge('hc', 'av', 'c', 'HAS_COMPONENT', { status: 'active' }),
      edge('u', 'fv', 'c', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
    ];
    const out = await layoutFeatureVersionDiagram(nodes, edges, 'LR');
    expect(out.nodes.some((n) => n.parentId === 'app')).toBe(true);
    expect(out.nodes.some((n) => n.data.type === 'applicationVersion')).toBe(false);
  });
});
