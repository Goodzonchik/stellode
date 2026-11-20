import type { ViewEdge, ViewNode } from '@stellode/models';
import { resolveBridgeNodeUnitId } from './resolve-bridge-node-unit-id';

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

const edge = (id: string, source: string, target: string, relationshipType: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('resolveBridgeNodeUnitId', () => {
  it('returns unit node id when type is unit in the pair', () => {
    expect(resolveBridgeNodeUnitId(viewNode(unitA, 'unit'), [], unitA, unitB)).toBe(unitA);
  });

  it('prefers data.unitId when it belongs to the pair', () => {
    const node = viewNode('team', 'team', unitB);
    expect(resolveBridgeNodeUnitId(node, [], unitA, unitB)).toBe(unitB);
  });

  it('falls back to PROVIDES / HAS_TEAM / OWNS peer in the pair', () => {
    const service = viewNode('svc', 'service');
    const edges = [edge('p', unitA, 'svc', 'PROVIDES')];
    expect(resolveBridgeNodeUnitId(service, edges, unitA, unitB)).toBe(unitA);

    const team = viewNode('team', 'team');
    expect(
      resolveBridgeNodeUnitId(team, [edge('t', unitB, 'team', 'HAS_TEAM')], unitA, unitB),
    ).toBe(unitB);

    const app = viewNode('app', 'app');
    expect(
      resolveBridgeNodeUnitId(app, [edge('o', unitA, 'app', 'OWNS')], unitA, unitB),
    ).toBe(unitA);
  });

  it('returns undefined when unitId and structural edges are missing', () => {
    expect(resolveBridgeNodeUnitId(viewNode('feature', 'feature'), [], unitA, unitB)).toBeUndefined();
  });

  it('ignores unitId outside the bridge pair', () => {
    const node = viewNode('team', 'team', 'unit-other');
    expect(resolveBridgeNodeUnitId(node, [], unitA, unitB)).toBeUndefined();
  });
});
