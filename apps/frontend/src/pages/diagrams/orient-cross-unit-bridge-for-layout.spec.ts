import type { ViewEdge, ViewNode } from '@stellode/models';
import { orientCrossUnitBridgeForLayout } from './orient-cross-unit-bridge-for-layout';

const unitA = 'unit-a';
const unitB = 'unit-b';

const viewNode = (id: string, type: string, unitId?: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: {
    label: id,
    type,
    ...(unitId !== undefined ? { unitId } : {}),
  },
});

const edge = (id: string, source: string, target: string, relationshipType = 'REL'): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('orientCrossUnitBridgeForLayout', () => {
  it('flips edges wholly inside unit B', () => {
    const nodes = [
      viewNode(unitA, 'unit'),
      viewNode(unitB, 'unit'),
      viewNode('team-b', 'team', unitB),
      viewNode('comp-b', 'component', unitB),
    ];
    const edges = [edge('maintains-b', 'team-b', 'comp-b', 'MAINTAINS')];
    const out = orientCrossUnitBridgeForLayout(nodes, edges, unitA, unitB);
    expect(out.edges[0]).toEqual({
      ...edges[0],
      source: 'comp-b',
      target: 'team-b',
    });
  });

  it('leaves edges wholly inside unit A unchanged', () => {
    const nodes = [
      viewNode(unitA, 'unit'),
      viewNode('team-a', 'team', unitA),
      viewNode('comp-a', 'component', unitA),
    ];
    const edges = [edge('maintains-a', 'team-a', 'comp-a', 'MAINTAINS')];
    const out = orientCrossUnitBridgeForLayout(nodes, edges, unitA, unitB);
    expect(out.edges[0]).toBe(edges[0]);
  });

  it('flips cross-unit edge from B to A into A to B', () => {
    const nodes = [
      viewNode('comp-a', 'component', unitA),
      viewNode('comp-b', 'component', unitB),
    ];
    const edges = [edge('dep', 'comp-b', 'comp-a', 'DEPENDS_ON')];
    const out = orientCrossUnitBridgeForLayout(nodes, edges, unitA, unitB);
    expect(out.edges[0]).toEqual({
      ...edges[0],
      source: 'comp-a',
      target: 'comp-b',
    });
  });

  it('keeps cross-unit edge already oriented A to B', () => {
    const nodes = [
      viewNode('comp-a', 'component', unitA),
      viewNode('comp-b', 'component', unitB),
    ];
    const edges = [edge('dep', 'comp-a', 'comp-b', 'DEPENDS_ON')];
    const out = orientCrossUnitBridgeForLayout(nodes, edges, unitA, unitB);
    expect(out.edges[0]).toBe(edges[0]);
  });

  it('treats Unit node id as owner when type is unit', () => {
    const nodes = [viewNode(unitB, 'unit'), viewNode('team-b', 'team', unitB)];
    const edges = [edge('has-team', unitB, 'team-b', 'HAS_TEAM')];
    const out = orientCrossUnitBridgeForLayout(nodes, edges, unitA, unitB);
    expect(out.edges[0]).toEqual({
      ...edges[0],
      source: 'team-b',
      target: unitB,
    });
  });

  it('does not flip when either endpoint lacks unit ownership', () => {
    const nodes = [
      viewNode('comp-a', 'component', unitA),
      viewNode('orphan', 'component'),
    ];
    const edges = [edge('x', 'orphan', 'comp-a')];
    const out = orientCrossUnitBridgeForLayout(nodes, edges, unitA, unitB);
    expect(out.edges[0]).toBe(edges[0]);
  });

  it('flips by data.unitId when nodes are nested under Unit parentId', () => {
    const nodes: ViewNode[] = [
      { ...viewNode(unitA, 'unit'), type: 'group' },
      { ...viewNode(unitB, 'unit'), type: 'group' },
      { ...viewNode('comp-a', 'component', unitA), parentId: unitA, extent: 'parent' },
      { ...viewNode('comp-b', 'component', unitB), parentId: unitB, extent: 'parent' },
    ];
    const edges = [edge('dep', 'comp-b', 'comp-a', 'DEPENDS_ON')];
    const out = orientCrossUnitBridgeForLayout(nodes, edges, unitA, unitB);
    expect(out.edges[0]).toEqual({
      ...edges[0],
      source: 'comp-a',
      target: 'comp-b',
    });
  });
});
