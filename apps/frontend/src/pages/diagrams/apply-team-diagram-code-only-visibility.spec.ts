import type { ViewEdge, ViewNode } from '@stellode/models';
import { applyTeamDiagramCodeOnlyVisibility } from './apply-team-diagram-code-only-visibility';

const node = (id: string, dataType: string, hidden = false): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: dataType },
  ...(hidden ? { hidden: true } : {}),
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
  hidden = false,
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
  ...(hidden ? { hidden: true } : {}),
});

describe('applyTeamDiagramCodeOnlyVisibility', () => {
  const nodes: ViewNode[] = [
    node('team', 'team', true),
    node('app', 'app'),
    node('comp', 'component'),
    node('feat', 'feature'),
    node('svc', 'service'),
    node('fv', 'featureVersion'),
  ];
  const edges: ViewEdge[] = [
    edge('maintains', 'team', 'comp', 'MAINTAINS', true),
    edge('uses', 'feat', 'comp', 'USES_COMPONENT_VERSION'),
    edge('agg', 'svc', 'feat', 'AGGREGATES'),
    edge('dep', 'comp', 'comp2', 'DEPENDS_ON'),
  ];
  const withPeer = [...nodes, node('comp2', 'component')];

  it('returns the same graph when codeOnly is false', () => {
    const result = applyTeamDiagramCodeOnlyVisibility(nodes, edges, false);
    expect(result.nodes).toBe(nodes);
    expect(result.edges).toBe(edges);
  });

  it('hides service, feature and featureVersion when codeOnly is true', () => {
    const { nodes: outNodes } = applyTeamDiagramCodeOnlyVisibility(withPeer, edges, true);
    expect(outNodes.find((n) => n.id === 'feat')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'svc')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'fv')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'app')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'comp')?.hidden).toBe(false);
  });

  it('hides USES and AGGREGATES and keeps DEPENDS_ON between components', () => {
    const { edges: outEdges } = applyTeamDiagramCodeOnlyVisibility(withPeer, edges, true);
    expect(outEdges.find((e) => e.id === 'uses')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'agg')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'dep')?.hidden).toBe(false);
  });

  it('preserves already hidden team anchor and its edges', () => {
    const { nodes: outNodes, edges: outEdges } = applyTeamDiagramCodeOnlyVisibility(
      withPeer,
      edges,
      true,
    );
    expect(outNodes.find((n) => n.id === 'team')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'maintains')?.hidden).toBe(true);
  });

  it('does not mutate inputs when codeOnly is true', () => {
    const snapshot = JSON.stringify({ nodes: withPeer, edges });
    applyTeamDiagramCodeOnlyVisibility(withPeer, edges, true);
    expect(JSON.stringify({ nodes: withPeer, edges })).toBe(snapshot);
  });
});
