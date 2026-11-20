import type { ViewEdge, ViewNode } from '@stellode/models';
import { projectUnitOverviewDiagram } from './project-unit-overview-diagram';

const node = (id: string, type: string, label = id): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label, type },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
  extra: Partial<ViewEdge> = {},
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
  label: relationshipType,
  ...extra,
});

describe('projectUnitOverviewDiagram', () => {
  it('removes Unit node and incident edges', () => {
    const nodes = [
      node('u', 'unit'),
      node('tm', 'team'),
      node('svc', 'service'),
      node('c', 'component', 'Comp'),
    ];
    const edges = [
      edge('ht', 'u', 'tm', 'HAS_TEAM'),
      edge('pr', 'u', 'svc', 'PROVIDES'),
      edge('ow', 'u', 'app', 'OWNS'),
      edge('mt', 'tm', 'c', 'MAINTAINS'),
    ];
    const out = projectUnitOverviewDiagram(nodes, edges);
    expect(out.nodes.some((n) => n.id === 'u')).toBe(false);
    expect(out.edges.some((e) => e.source === 'u' || e.target === 'u')).toBe(false);
    expect(out.nodes.some((n) => n.id === 'tm')).toBe(true);
    expect(out.edges.some((e) => e.relationshipType === 'MAINTAINS')).toBe(true);
  });

  it('filters DEPENDS_ON edges', () => {
    const nodes = [node('c1', 'component'), node('c2', 'component')];
    const edges = [edge('d', 'c1', 'c2', 'DEPENDS_ON')];
    const out = projectUnitOverviewDiagram(nodes, edges);
    expect(out.edges).toHaveLength(0);
  });

  it('collapses USES_COMPONENT_VERSION to Feature→Component with label USES', () => {
    const nodes = [
      node('f', 'feature', 'Feat'),
      node('fv', 'featureVersion'),
      node('c', 'component', 'Comp'),
      node('cv', 'componentVersion'),
    ];
    const edges = [
      edge('hv', 'f', 'fv', 'HAS_VERSION'),
      edge('hvc', 'c', 'cv', 'HAS_VERSION'),
      edge('uses', 'fv', 'cv', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
    ];
    const out = projectUnitOverviewDiagram(nodes, edges);
    expect(out.nodes.some((n) => n.id === 'cv')).toBe(false);
    expect(out.nodes.find((n) => n.id === 'c')?.data.label).toBe('Comp');
    const uses = out.edges.filter((e) => e.label === 'USES');
    expect(uses).toHaveLength(1);
    expect(uses[0]?.source).toBe('f');
    expect(uses[0]?.target).toBe('c');
    expect(uses[0]?.relationshipType).toBe('USES_COMPONENT_VERSION');
    expect(uses[0]?.applicationId).toBe('app');
  });

  it('dedupes USES by feature, component and applicationId', () => {
    const nodes = [
      node('f', 'feature'),
      node('fv1', 'featureVersion'),
      node('fv2', 'featureVersion'),
      node('c', 'component', 'Comp'),
      node('cv1', 'componentVersion'),
      node('cv2', 'componentVersion'),
    ];
    const edges = [
      edge('h1', 'f', 'fv1', 'HAS_VERSION'),
      edge('h2', 'f', 'fv2', 'HAS_DRAFT'),
      edge('hc1', 'c', 'cv1', 'HAS_VERSION'),
      edge('hc2', 'c', 'cv2', 'HAS_VERSION'),
      edge('u1', 'fv1', 'cv1', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
      edge('u2', 'fv2', 'cv2', 'USES_COMPONENT_VERSION', { applicationId: 'app' }),
      edge('u3', 'fv1', 'cv1', 'USES_COMPONENT_VERSION', { applicationId: 'app-b' }),
    ];
    const out = projectUnitOverviewDiagram(nodes, edges);
    const uses = out.edges.filter((e) => e.label === 'USES');
    expect(uses).toHaveLength(2);
    const appIds = uses.map((e) => e.applicationId).sort();
    expect(appIds).toEqual(['app', 'app-b']);
  });

  it('remaps HAS_COMPONENT targets from CV to parent Component', () => {
    const nodes = [
      node('av', 'applicationVersion'),
      node('c', 'component', 'Comp'),
      node('cv', 'componentVersion'),
    ];
    const edges = [
      edge('hv', 'c', 'cv', 'HAS_VERSION'),
      edge('hc', 'av', 'cv', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = projectUnitOverviewDiagram(nodes, edges);
    const hc = out.edges.find((e) => e.relationshipType === 'HAS_COMPONENT');
    expect(hc?.target).toBe('c');
    expect(out.nodes.some((n) => n.id === 'cv')).toBe(false);
  });

  it('collapses CV under dependency parent and remaps HAS_COMPONENT', () => {
    const nodes = [
      node('av', 'applicationVersion'),
      node('dep', 'dependency', 'Lib'),
      node('cv', 'componentVersion'),
    ];
    const edges = [
      edge('hv', 'dep', 'cv', 'HAS_VERSION'),
      edge('hc', 'av', 'cv', 'HAS_COMPONENT', { status: 'active' }),
    ];
    const out = projectUnitOverviewDiagram(nodes, edges);
    expect(out.nodes.some((n) => n.id === 'cv')).toBe(false);
    expect(out.nodes.find((n) => n.id === 'dep')?.data.type).toBe('dependency');
    expect(out.edges.find((e) => e.relationshipType === 'HAS_COMPONENT')?.target).toBe('dep');
  });
});
