import type { ViewEdge, ViewNode } from '@stellode/models';
import { applyUnitDiagramInstanceFilterPhase2 } from './apply-unit-diagram-instance-filter-phase2';
import { emptyUnitDiagramInstanceFilter } from './empty-unit-diagram-instance-filter';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';

const node = (
  id: string,
  dataType: string,
  extra: {
    asGroup?: boolean;
    parentId?: string;
    data?: Partial<ViewNode['data']>;
  } = {},
): ViewNode => ({
  id,
  type: extra.asGroup === true ? 'group' : 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...(extra.parentId !== undefined ? { parentId: extra.parentId } : {}),
  data: { label: id, type: dataType, ...extra.data },
});

const edge = (id: string, source: string, target: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType: 'USES_COMPONENT_VERSION',
});

describe('applyUnitDiagramInstanceFilterPhase2', () => {
  it('hides application and nested copies; keeps flat component', () => {
    const nodes = [
      node('app', 'application', { asGroup: true }),
      node('app::c', 'component', {
        parentId: 'app',
        data: { label: 'c', type: 'component', sourceId: 'c' },
      }),
      node('flat', 'component'),
      node('tm', 'team'),
    ];
    const edges = [
      edge('e1', 'tm', 'app::c'),
      edge('e2', 'tm', 'flat'),
    ];
    const filter = {
      hiddenIds: {
        ...emptyUnitDiagramInstanceFilter().hiddenIds,
        [UnitDiagramFilterKind.App]: new Set(['app']),
      },
    };
    const out = applyUnitDiagramInstanceFilterPhase2(nodes, edges, filter);
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['flat', 'tm']);
    expect(out.edges.map((e) => e.id)).toEqual(['e2']);
  });

  it('hides only copy inside hidden app for duplicates', () => {
    const nodes = [
      node('app-a', 'application', { asGroup: true }),
      node('app-b', 'application', { asGroup: true }),
      node('app-a::c', 'component', {
        parentId: 'app-a',
        data: { label: 'c', type: 'component', sourceId: 'c', duplicate: true },
      }),
      node('app-b::c', 'component', {
        parentId: 'app-b',
        data: { label: 'c', type: 'component', sourceId: 'c', duplicate: true },
      }),
    ];
    const filter = {
      hiddenIds: {
        ...emptyUnitDiagramInstanceFilter().hiddenIds,
        [UnitDiagramFilterKind.App]: new Set(['app-a']),
      },
    };
    const out = applyUnitDiagramInstanceFilterPhase2(nodes, [], filter);
    expect(out.nodes.map((n) => n.id).sort()).toEqual(['app-b', 'app-b::c']);
  });
});
