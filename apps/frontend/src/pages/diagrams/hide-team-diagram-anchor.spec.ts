import type { ViewEdge, ViewNode } from '@stellode/models';
import { hideTeamDiagramAnchor } from './hide-team-diagram-anchor';

const node = (id: string, dataType: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: dataType },
});

const edge = (
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

describe('hideTeamDiagramAnchor', () => {
  it('hides Team node and MAINTAINS edge, keeps Component visible', () => {
    const nodes: ViewNode[] = [node('tm', 'team'), node('cmp', 'component')];
    const edges: ViewEdge[] = [edge('e1', 'tm', 'cmp', 'MAINTAINS')];
    const { nodes: outNodes, edges: outEdges } = hideTeamDiagramAnchor(nodes, edges);
    expect(outNodes.find((n) => n.id === 'tm')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'cmp')?.hidden).toBe(false);
    expect(outEdges[0]?.hidden).toBe(true);
  });

  it('keeps Feature and Service visible without Team', () => {
    const nodes: ViewNode[] = [
      node('tm', 'team'),
      node('f', 'feature'),
      node('s', 'service'),
    ];
    const edges: ViewEdge[] = [edge('e1', 's', 'f', 'AGGREGATES')];
    const { nodes: outNodes, edges: outEdges } = hideTeamDiagramAnchor(nodes, edges);
    expect(outNodes.find((n) => n.id === 'tm')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'f')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 's')?.hidden).toBe(false);
    expect(outEdges[0]?.hidden).toBe(false);
  });
});
