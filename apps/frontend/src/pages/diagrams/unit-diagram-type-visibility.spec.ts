import type { ViewEdge, ViewNode } from '@stellode/models';
import {
  applyUnitDiagramVisibility,
  defaultUnitDiagramVisibility,
  UnitDiagramNodeKind,
  viewNodeUnitKind,
} from './unit-diagram-type-visibility';

const node = (id: string, dataType: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: dataType },
});

const edge = (id: string, source: string, target: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType: 'HAS_TEAM',
});

describe('viewNodeUnitKind', () => {
  it('returns kind for unit hub types', () => {
    expect(viewNodeUnitKind(node('a', 'unit'))).toBe(UnitDiagramNodeKind.Unit);
    expect(viewNodeUnitKind(node('b', 'team'))).toBe(UnitDiagramNodeKind.Team);
    expect(viewNodeUnitKind(node('app1', 'application'))).toBe(UnitDiagramNodeKind.App);
  });

  it('returns component kind for component and dependency node types', () => {
    expect(viewNodeUnitKind(node('c', 'component'))).toBe(UnitDiagramNodeKind.Component);
    expect(viewNodeUnitKind(node('d', 'dependency'))).toBe(UnitDiagramNodeKind.Component);
  });
});

describe('applyUnitDiagramVisibility', () => {
  const nodes: ViewNode[] = [node('t', 'unit'), node('tm', 'team')];
  const edges: ViewEdge[] = [edge('e1', 't', 'tm')];

  it('hides team nodes and incident edges when team is off', () => {
    const vis = { ...defaultUnitDiagramVisibility, team: false };
    const { nodes: outNodes, edges: outEdges } = applyUnitDiagramVisibility(nodes, edges, vis);
    expect(outNodes.find((n) => n.id === 't')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'tm')?.hidden).toBe(true);
    expect(outEdges[0]?.hidden).toBe(true);
  });

  it('hides unit and shows other kinds when default visibility', () => {
    const { nodes: outNodes, edges: outEdges } = applyUnitDiagramVisibility(
      nodes,
      edges,
      defaultUnitDiagramVisibility,
    );
    expect(outNodes.find((n) => n.id === 't')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'tm')?.hidden).toBe(false);
    expect(outEdges[0]?.hidden).toBe(true);
  });

  it('hides component nodes when component visibility is off', () => {
    const nodes: ViewNode[] = [
      node('t', 'unit'),
      node('tm', 'team'),
      node('cmp', 'component'),
    ];
    const edges: ViewEdge[] = [
      edge('e1', 't', 'tm'),
      { ...edge('e2', 'tm', 'cmp'), relationshipType: 'MAINTAINS' },
    ];
    const vis = { ...defaultUnitDiagramVisibility, component: false };
    const { nodes: outNodes, edges: outEdges } = applyUnitDiagramVisibility(nodes, edges, vis);
    expect(outNodes.find((n) => n.id === 'cmp')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'e2')?.hidden).toBe(true);
  });

  it('always hides unit node even when visibility.unit is true', () => {
    const vis = { ...defaultUnitDiagramVisibility, unit: true };
    const { nodes: outNodes } = applyUnitDiagramVisibility(nodes, edges, vis);
    expect(outNodes.find((n) => n.id === 't')?.hidden).toBe(true);
  });

  it('hides all components when applications visibility is off', () => {
    const graphNodes: ViewNode[] = [
      node('tm', 'team'),
      node('app', 'application'),
      node('cmp', 'component'),
      node('flat', 'component'),
    ];
    const graphEdges: ViewEdge[] = [
      { ...edge('e1', 'tm', 'cmp'), relationshipType: 'MAINTAINS' },
      { ...edge('e2', 'tm', 'flat'), relationshipType: 'MAINTAINS' },
    ];
    const vis = { ...defaultUnitDiagramVisibility, app: false };
    const { nodes: outNodes } = applyUnitDiagramVisibility(graphNodes, graphEdges, vis);
    expect(outNodes.find((n) => n.id === 'app')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'cmp')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'flat')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'tm')?.hidden).toBe(false);
  });
});
