import type { ViewEdge, ViewNode } from '@stellode/models';
import { filterUnitDiagramCanvas } from './filter-unit-diagram-canvas';

const viewNode = (
  id: string,
  typeKey: string,
  extras: Partial<Omit<ViewNode, 'data'>> & { data?: Partial<ViewNode['data']> } = {},
): ViewNode => ({
  id,
  type: extras.type ?? 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...extras,
  data: { label: id, type: typeKey, ...extras.data },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
): ViewEdge => ({ id, source, target, type: 'default', relationshipType });

describe('filterUnitDiagramCanvas', () => {
  it('removes OWNS edges from the canvas graph', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('app', 'app', { type: 'group' }),
      viewNode('t', 'team'),
    ];
    const edges = [
      edge('owns', 'unit', 'app', 'OWNS'),
      edge('team', 'unit', 't', 'HAS_TEAM'),
    ];
    const out = filterUnitDiagramCanvas(nodes, edges);
    expect(out.edges.some((e) => e.relationshipType === 'OWNS')).toBe(false);
    expect(out.edges.some((e) => e.relationshipType === 'HAS_TEAM')).toBe(true);
  });

  it('removes Application nodes that are not group containers', () => {
    const nodes = [
      viewNode('unit', 'unit'),
      viewNode('empty-app', 'app'),
      viewNode('filled-app', 'app', { type: 'group' }),
      viewNode('filled-app::c', 'component', {
        parentId: 'filled-app',
        data: { sourceId: 'c' },
      }),
    ];
    const edges = [
      edge('owns-empty', 'unit', 'empty-app', 'OWNS'),
      edge('owns-filled', 'unit', 'filled-app', 'OWNS'),
    ];
    const out = filterUnitDiagramCanvas(nodes, edges);
    expect(out.nodes.map((n) => n.id).sort()).toEqual([
      'filled-app',
      'filled-app::c',
      'unit',
    ]);
    expect(out.edges).toEqual([]);
  });

  it('keeps Application group containers with children', () => {
    const nodes = [
      viewNode('app', 'app', { type: 'group' }),
      viewNode('app::c', 'component', {
        parentId: 'app',
        data: { sourceId: 'c' },
      }),
      viewNode('team', 'team'),
    ];
    const edges = [edge('m', 'team', 'app::c', 'MAINTAINS')];
    const out = filterUnitDiagramCanvas(nodes, edges);
    expect(out.nodes.find((n) => n.id === 'app')?.type).toBe('group');
    expect(out.edges).toEqual(edges);
  });

  it('does not mutate inputs', () => {
    const nodes = [viewNode('app', 'app')];
    const edges = [edge('owns', 'u', 'app', 'OWNS')];
    const nodesSnapshot = JSON.stringify(nodes);
    const edgesSnapshot = JSON.stringify(edges);
    filterUnitDiagramCanvas(nodes, edges);
    expect(JSON.stringify(nodes)).toBe(nodesSnapshot);
    expect(JSON.stringify(edges)).toBe(edgesSnapshot);
  });
});
