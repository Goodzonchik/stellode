import type { ViewEdge, ViewNode } from '@stellode/models';
import { layoutVisibleDiagram } from './layout-visible-diagram';

const unitA = 'unit-a';
const unitB = 'unit-b';

const viewNode = (
  id: string,
  type: string,
  options: { unitId?: string } = {},
): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: {
    label: id,
    type,
    ...(options.unitId !== undefined ? { unitId: options.unitId } : {}),
  },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
  extra: Partial<ViewEdge> = {},
): ViewEdge => ({ id, source, target, type: 'default', relationshipType, ...extra });

describe('layoutVisibleDiagram crossUnitBridge', () => {
  it('nests Application under Unit and Component under Application', async () => {
    const nodes = [
      viewNode(unitA, 'unit'),
      viewNode(unitB, 'unit'),
      viewNode('app-a', 'app', { unitId: unitA }),
      viewNode('app-b', 'app', { unitId: unitB }),
      viewNode('comp-a', 'component', { unitId: unitA }),
      viewNode('comp-b', 'component', { unitId: unitB }),
      viewNode('team-a', 'team', { unitId: unitA }),
    ];
    const edges = [
      edge('hc-a', 'app-a', 'comp-a', 'HAS_COMPONENT', { status: 'active' }),
      edge('hc-b', 'app-b', 'comp-b', 'HAS_COMPONENT', { status: 'active' }),
      edge('dep', 'comp-a', 'comp-b', 'DEPENDS_ON'),
      edge('has-team', unitA, 'team-a', 'HAS_TEAM'),
      edge('owns-a', unitA, 'app-a', 'OWNS'),
    ];
    const out = await layoutVisibleDiagram(nodes, edges, 'LR', {
      crossUnitBridge: { unitIdA: unitA, unitIdB: unitB },
    });
    const byId = new Map(out.nodes.map((node) => [node.id, node]));
    expect(byId.get(unitA)?.type).toBe('group');
    expect(byId.get(unitB)?.type).toBe('group');
    expect(byId.get('app-a')?.parentId).toBe(unitA);
    expect(byId.get('app-b')?.parentId).toBe(unitB);
    expect(byId.get('team-a')?.parentId).toBe(unitA);
    expect(byId.get('app-a::comp-a')?.parentId).toBe('app-a');
    expect(out.edges.some((item) => item.relationshipType === 'HAS_TEAM')).toBe(false);
    expect(out.edges.some((item) => item.relationshipType === 'OWNS')).toBe(false);
    expect(out.edges.some((item) => item.relationshipType === 'DEPENDS_ON')).toBe(true);
  });

  it('applies codeOnly after grouping so nested components remain', async () => {
    const nodes = [
      viewNode(unitA, 'unit'),
      viewNode(unitB, 'unit'),
      viewNode('app-a', 'app', { unitId: unitA }),
      viewNode('app-b', 'app', { unitId: unitB }),
      viewNode('comp-a', 'component', { unitId: unitA }),
      viewNode('comp-b', 'component', { unitId: unitB }),
      viewNode('feat-a', 'feature', { unitId: unitA }),
      viewNode('svc-a', 'service', { unitId: unitA }),
    ];
    const edges = [
      edge('hc-a', 'app-a', 'comp-a', 'HAS_COMPONENT', { status: 'active' }),
      edge('hc-b', 'app-b', 'comp-b', 'HAS_COMPONENT', { status: 'active' }),
      edge('uses', 'feat-a', 'comp-a', 'USES_COMPONENT_VERSION', { applicationId: 'app-a' }),
      edge('agg', 'svc-a', 'feat-a', 'AGGREGATES'),
      edge('dep', 'comp-a', 'comp-b', 'DEPENDS_ON'),
    ];
    const out = await layoutVisibleDiagram(nodes, edges, 'LR', {
      crossUnitBridge: { unitIdA: unitA, unitIdB: unitB },
      crossUnitBridgeVisibility: { teamsVisible: true, codeOnly: true },
    });
    const ids = out.nodes.map((node) => node.id);
    expect(ids).toContain('app-a::comp-a');
    expect(ids).toContain('app-b::comp-b');
    expect(ids).not.toContain('feat-a');
    expect(ids).not.toContain('svc-a');
    expect(out.edges.some((item) => item.relationshipType === 'DEPENDS_ON')).toBe(true);
  });
});
