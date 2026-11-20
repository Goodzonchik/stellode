import type { ViewEdge, ViewNode } from '@stellode/models';
import { collectHoverPathIds } from './collect-hover-path-ids';

const toSorted = (ids: ReadonlySet<string>): string[] => [...ids].sort();

const viewNode = (
  id: string,
  type: string,
  extras: Partial<Omit<ViewNode, 'id' | 'type' | 'data'>> & {
    readonly data?: Partial<ViewNode['data']>;
  } = {},
): ViewNode => ({
  id,
  type: type === 'application' ? 'group' : 'custom',
  draggable: false,
  position: { x: 0, y: 0 },
  ...extras,
  data: { label: id, type, ...extras.data },
});

const viewEdge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('collectHoverPathIds', () => {
  const team = viewNode('team-1', 'team');
  const service = viewNode('svc-1', 'service');
  const feature = viewNode('feat-1', 'feature');
  const app = viewNode('app-1', 'application');
  const component = viewNode('comp-1', 'component', { parentId: 'app-1' });
  const otherFeature = viewNode('feat-2', 'feature');
  const otherComp = viewNode('comp-2', 'component', { parentId: 'app-2' });
  const app2 = viewNode('app-2', 'application');

  const edges: ViewEdge[] = [
    viewEdge('e-maintains', 'team-1', 'comp-1', 'MAINTAINS'),
    viewEdge('e-uses', 'feat-1', 'comp-1', 'USES_COMPONENT_VERSION'),
    viewEdge('e-agg', 'svc-1', 'feat-1', 'AGGREGATES'),
    viewEdge('e-uses-other', 'feat-2', 'comp-2', 'USES_COMPONENT_VERSION'),
    viewEdge('e-agg-other', 'svc-1', 'feat-2', 'AGGREGATES'),
  ];

  const nodes: ViewNode[] = [
    team,
    service,
    feature,
    app,
    component,
    otherFeature,
    otherComp,
    app2,
  ];

  it('component: level1 + Feature ascent to Service + own Application', () => {
    const path = collectHoverPathIds('comp-1', nodes, edges, 'unit');
    expect(toSorted(path.nodeIds)).toEqual([
      'app-1',
      'comp-1',
      'feat-1',
      'svc-1',
      'team-1',
    ]);
    expect(toSorted(path.edgeIds)).toEqual(['e-agg', 'e-maintains', 'e-uses']);
  });

  it('dependency: same path rules as component', () => {
    const dep = viewNode('dep-1', 'dependency', {
      parentId: 'app-1',
      data: { label: 'Lib', type: 'dependency', isDependency: true },
    });
    const depEdges: ViewEdge[] = [
      viewEdge('e-maintains-dep', 'team-1', 'dep-1', 'MAINTAINS'),
      viewEdge('e-uses-dep', 'feat-1', 'dep-1', 'USES_COMPONENT_VERSION'),
      viewEdge('e-agg', 'svc-1', 'feat-1', 'AGGREGATES'),
    ];
    const path = collectHoverPathIds(
      'dep-1',
      [team, service, feature, app, dep],
      depEdges,
      'unit',
    );
    expect(toSorted(path.nodeIds)).toEqual([
      'app-1',
      'dep-1',
      'feat-1',
      'svc-1',
      'team-1',
    ]);
  });

  it('component duplicate: does not include sibling copy Application', () => {
    const copyA = viewNode('app-1::comp-x', 'component', {
      parentId: 'app-1',
      data: { label: 'X', type: 'component', duplicate: true, sourceId: 'comp-x' },
    });
    const copyB = viewNode('app-2::comp-x', 'component', {
      parentId: 'app-2',
      data: { label: 'X', type: 'component', duplicate: true, sourceId: 'comp-x' },
    });
    const dupEdges: ViewEdge[] = [
      viewEdge('m-a', 'team-1', 'app-1::comp-x', 'MAINTAINS'),
      viewEdge('m-b', 'team-1', 'app-2::comp-x', 'MAINTAINS'),
    ];
    const path = collectHoverPathIds(
      'app-1::comp-x',
      [team, app, app2, copyA, copyB],
      dupEdges,
      'unit',
    );
    expect(path.nodeIds.has('app-1')).toBe(true);
    expect(path.nodeIds.has('app-2')).toBe(false);
    expect(path.nodeIds.has('app-2::comp-x')).toBe(false);
  });

  it('service: only AGGREGATES to Feature, no Component descent', () => {
    const path = collectHoverPathIds('svc-1', nodes, edges, 'unit');
    expect(toSorted(path.nodeIds)).toEqual(['feat-1', 'feat-2', 'svc-1']);
    expect(toSorted(path.edgeIds)).toEqual(['e-agg', 'e-agg-other']);
    expect(path.nodeIds.has('comp-1')).toBe(false);
  });

  it('feature: USES + AGGREGATES + Application of related components', () => {
    const path = collectHoverPathIds('feat-1', nodes, edges, 'unit');
    expect(toSorted(path.nodeIds)).toEqual([
      'app-1',
      'comp-1',
      'feat-1',
      'svc-1',
    ]);
    expect(toSorted(path.edgeIds)).toEqual(['e-agg', 'e-uses']);
  });

  it('team: MAINTAINS + Application of components', () => {
    const path = collectHoverPathIds('team-1', nodes, edges, 'unit');
    expect(toSorted(path.nodeIds)).toEqual(['app-1', 'comp-1', 'team-1']);
    expect(toSorted(path.edgeIds)).toEqual(['e-maintains']);
  });

  it('application: children + Team/Feature via their incident edges', () => {
    const path = collectHoverPathIds('app-1', nodes, edges, 'unit');
    expect(toSorted(path.nodeIds)).toEqual([
      'app-1',
      'comp-1',
      'feat-1',
      'team-1',
    ]);
    expect(toSorted(path.edgeIds)).toEqual(['e-maintains', 'e-uses']);
  });

  it('skips hidden edges and nodes', () => {
    const hiddenEdge = {
      ...viewEdge('e-hidden', 'team-1', 'comp-1', 'MAINTAINS'),
      hidden: true,
    };
    const path = collectHoverPathIds(
      'comp-1',
      nodes,
      [hiddenEdge, viewEdge('e-uses', 'feat-1', 'comp-1', 'USES_COMPONENT_VERSION')],
      'unit',
    );
    expect(path.edgeIds.has('e-hidden')).toBe(false);
    expect(path.nodeIds.has('team-1')).toBe(false);
  });

  it('cross-unit: CROSS_UNIT_LINK neighbors only', () => {
    const u1 = viewNode('unit-1', 'unit');
    const u2 = viewNode('unit-2', 'unit');
    const u3 = viewNode('unit-3', 'unit');
    const bridgeEdges: ViewEdge[] = [
      viewEdge('b12', 'unit-1', 'unit-2', 'CROSS_UNIT_LINK'),
      viewEdge('b13', 'unit-1', 'unit-3', 'CROSS_UNIT_LINK'),
    ];
    const path = collectHoverPathIds(
      'unit-1',
      [u1, u2, u3],
      bridgeEdges,
      'cross-unit',
    );
    expect(toSorted(path.nodeIds)).toEqual(['unit-1', 'unit-2', 'unit-3']);
    expect(toSorted(path.edgeIds)).toEqual(['b12', 'b13']);
  });

  it('returns empty path for unknown hovered id', () => {
    const path = collectHoverPathIds('missing', nodes, edges, 'unit');
    expect(path.nodeIds.size).toBe(0);
    expect(path.edgeIds.size).toBe(0);
  });
});
