import type { ViewEdge, ViewNode } from '@stellode/models';
import { emptyUnitDiagramInstanceFilter } from './empty-unit-diagram-instance-filter';
import { projectUnitDiagramVisibleGraph } from './project-unit-diagram-visible-graph';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';

const viewNode = (id: string, type: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
  extra: Partial<ViewEdge> = {},
): ViewEdge => ({ id, source, target, type: 'default', relationshipType, ...extra });

const ids = (nodes: ViewNode[]): string[] => nodes.map((n) => n.id).sort();

describe('projectUnitDiagramVisibleGraph', () => {
  it('hides nested copy when app off, keeps flat, drops dangling edges; component off removes all copies', () => {
    const nodes = [
      viewNode('app-a', 'application'),
      viewNode('app-b', 'application'),
      viewNode('c', 'component'),
      viewNode('flat', 'component'),
      viewNode('tm', 'team'),
      viewNode('feat', 'feature'),
    ];
    const edges = [
      edge('hc-a', 'app-a', 'c', 'HAS_COMPONENT', { status: 'active' }),
      edge('hc-b', 'app-b', 'c', 'HAS_COMPONENT', { status: 'active' }),
      edge('m-flat', 'tm', 'flat', 'MAINTAINS'),
      edge('m-c', 'tm', 'c', 'MAINTAINS'),
      edge('u', 'feat', 'c', 'USES_COMPONENT_VERSION', { applicationId: 'app-a' }),
    ];
    const filter = {
      hiddenIds: {
        ...emptyUnitDiagramInstanceFilter().hiddenIds,
        [UnitDiagramFilterKind.App]: new Set(['app-a']),
        [UnitDiagramFilterKind.Component]: new Set(['flat']),
      },
    };
    const out = projectUnitDiagramVisibleGraph(nodes, edges, filter);
    expect(ids(out.nodes)).toEqual(['app-b', 'app-b::c', 'feat', 'tm']);
    expect(out.edges.every((e) => ids(out.nodes).includes(e.source) && ids(out.nodes).includes(e.target))).toBe(
      true,
    );
    expect(out.nodes.some((n) => n.id === 'flat')).toBe(false);
    expect(out.nodes.some((n) => n.id === 'app-a' || n.id === 'app-a::c')).toBe(false);
  });
});
