import type { ViewEdge, ViewNode } from '@stellode/models';
import { applyUnitDiagramInstanceFilterPhase1 } from './apply-unit-diagram-instance-filter-phase1';
import { emptyUnitDiagramInstanceFilter } from './empty-unit-diagram-instance-filter';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';

const node = (id: string, type: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type },
});

const edge = (id: string, source: string, target: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType: 'MAINTAINS',
});

describe('applyUnitDiagramInstanceFilterPhase1', () => {
  it('removes hidden team/service/feature/component and dangling edges', () => {
    const nodes = [
      node('tm', 'team'),
      node('svc', 'service'),
      node('feat', 'feature'),
      node('cmp', 'component'),
      node('app', 'application'),
    ];
    const edges = [
      edge('e1', 'tm', 'cmp'),
      edge('e2', 'svc', 'feat'),
      edge('e3', 'feat', 'cmp'),
    ];
    const next = {
      hiddenIds: {
        ...emptyUnitDiagramInstanceFilter().hiddenIds,
        [UnitDiagramFilterKind.Team]: new Set(['tm']),
        [UnitDiagramFilterKind.Service]: new Set(['svc']),
        [UnitDiagramFilterKind.Feature]: new Set(['feat']),
        [UnitDiagramFilterKind.Component]: new Set(['cmp']),
      },
    };
    const out = applyUnitDiagramInstanceFilterPhase1(nodes, edges, next);
    expect(out.nodes.map((n) => n.id)).toEqual(['app']);
    expect(out.edges).toEqual([]);
  });

  it('keeps applications on flat even when listed in hiddenIds.app', () => {
    const nodes = [node('app', 'app'), node('tm', 'team')];
    const edges = [edge('e', 'tm', 'app')];
    const filter = {
      hiddenIds: {
        ...emptyUnitDiagramInstanceFilter().hiddenIds,
        [UnitDiagramFilterKind.App]: new Set(['app']),
      },
    };
    const out = applyUnitDiagramInstanceFilterPhase1(nodes, edges, filter);
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['app', 'tm']);
    expect(out.edges).toHaveLength(1);
  });
});
