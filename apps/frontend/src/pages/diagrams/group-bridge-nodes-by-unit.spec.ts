import type { ViewEdge, ViewNode } from '@stellode/models';
import { groupBridgeNodesByUnit } from './group-bridge-nodes-by-unit';

const unitA = 'unit-a';
const unitB = 'unit-b';

const viewNode = (
  id: string,
  type: string,
  options: { unitId?: string; parentId?: string; nodeType?: ViewNode['type'] } = {},
): ViewNode => ({
  id,
  type: options.nodeType ?? 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...(options.parentId !== undefined
    ? { parentId: options.parentId, extent: 'parent' as const }
    : {}),
  data: {
    label: id,
    type,
    ...(options.unitId !== undefined ? { unitId: options.unitId } : {}),
  },
});

const edge = (id: string, source: string, target: string, relationshipType: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('groupBridgeNodesByUnit', () => {
  it('converts pair Unit nodes to group containers with data.unitId', () => {
    const nodes = [viewNode(unitA, 'unit'), viewNode(unitB, 'unit')];
    const out = groupBridgeNodesByUnit(nodes, [], unitA, unitB);
    expect(out.nodes.map((node) => ({ id: node.id, type: node.type, unitId: node.data.unitId }))).toEqual([
      { id: unitA, type: 'group', unitId: unitA },
      { id: unitB, type: 'group', unitId: unitB },
    ]);
  });

  it('nests Team, Service, Feature and Application under Unit by unitId', () => {
    const nodes = [
      viewNode(unitA, 'unit'),
      viewNode('team', 'team', { unitId: unitA }),
      viewNode('svc', 'service', { unitId: unitA }),
      viewNode('feat', 'feature', { unitId: unitA }),
      viewNode('app', 'app', { unitId: unitA, nodeType: 'group' }),
      viewNode('comp', 'component', { unitId: unitA, parentId: 'app' }),
    ];
    const out = groupBridgeNodesByUnit(nodes, [], unitA, unitB);
    const byId = new Map(out.nodes.map((node) => [node.id, node]));
    expect(byId.get('team')?.parentId).toBe(unitA);
    expect(byId.get('svc')?.parentId).toBe(unitA);
    expect(byId.get('feat')?.parentId).toBe(unitA);
    expect(byId.get('app')?.parentId).toBe(unitA);
    expect(byId.get('comp')?.parentId).toBe('app');
  });

  it('removes orphan Component without Application parentId', () => {
    const nodes = [
      viewNode(unitA, 'unit'),
      viewNode('orphan', 'component', { unitId: unitA }),
      viewNode('ok-app', 'app', { unitId: unitA, nodeType: 'group' }),
      viewNode('ok-comp', 'component', { unitId: unitA, parentId: 'ok-app' }),
    ];
    const edges = [edge('dep', 'orphan', 'ok-comp', 'DEPENDS_ON')];
    const out = groupBridgeNodesByUnit(nodes, edges, unitA, unitB);
    expect(out.nodes.map((node) => node.id)).toEqual([unitA, 'ok-app', 'ok-comp']);
    expect(out.edges).toEqual([]);
  });

  it('uses structural edge fallback when unitId is missing', () => {
    const nodes = [
      viewNode(unitB, 'unit'),
      viewNode('team', 'team'),
      viewNode('svc', 'service'),
      viewNode('app', 'app', { nodeType: 'group' }),
    ];
    const edges = [
      edge('ht', unitB, 'team', 'HAS_TEAM'),
      edge('pr', unitB, 'svc', 'PROVIDES'),
      edge('ow', unitB, 'app', 'OWNS'),
    ];
    const out = groupBridgeNodesByUnit(nodes, edges, unitA, unitB);
    expect(out.nodes.find((node) => node.id === 'team')?.parentId).toBe(unitB);
    expect(out.nodes.find((node) => node.id === 'svc')?.parentId).toBe(unitB);
    expect(out.nodes.find((node) => node.id === 'app')?.parentId).toBe(unitB);
  });

  it('leaves nestable nodes flat when unit cannot be resolved', () => {
    const nodes = [viewNode(unitA, 'unit'), viewNode('feat', 'feature')];
    const out = groupBridgeNodesByUnit(nodes, [], unitA, unitB);
    expect(out.nodes.find((node) => node.id === 'feat')?.parentId).toBeUndefined();
  });

  it('orders Unit groups before their children', () => {
    const nodes = [
      viewNode('app', 'app', { unitId: unitA, nodeType: 'group' }),
      viewNode('comp', 'component', { parentId: 'app' }),
      viewNode(unitA, 'unit'),
    ];
    const out = groupBridgeNodesByUnit(nodes, [], unitA, unitB);
    expect(out.nodes.map((node) => node.id)).toEqual([unitA, 'app', 'comp']);
  });
});
