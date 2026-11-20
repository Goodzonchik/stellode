import type { ViewEdge, ViewNode } from '@stellode/models';
import { defaultUnitDiagramVisibility } from './unit-diagram-type-visibility';
import { applyComponentDiagramVisibility } from './component-diagram-type-visibility';

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
  relationshipType: 'MAINTAINS',
});

describe('applyComponentDiagramVisibility', () => {
  const nodes: ViewNode[] = [
    node('c', 'component'),
    node('t', 'team'),
    node('s', 'service'),
    node('f', 'feature'),
    node('a', 'app'),
  ];
  const edges: ViewEdge[] = [
    edge('e1', 't', 'c'),
    edge('e-service', 's', 'f'),
    edge('e2', 'f', 'c'),
    edge('e3', 'a', 'c'),
  ];

  it('keeps component visible when component visibility is off', () => {
    const visibility = { ...defaultUnitDiagramVisibility, component: false };
    const { nodes: outNodes } = applyComponentDiagramVisibility(nodes, edges, visibility);
    expect(outNodes.find((item) => item.id === 'c')?.hidden).toBe(false);
  });

  it('hides feature nodes and related edges when feature is off', () => {
    const visibility = { ...defaultUnitDiagramVisibility, feature: false };
    const { nodes: outNodes, edges: outEdges } = applyComponentDiagramVisibility(nodes, edges, visibility);
    expect(outNodes.find((item) => item.id === 'f')?.hidden).toBe(true);
    expect(outEdges.find((item) => item.id === 'e2')?.hidden).toBe(true);
  });

  it('hides service nodes and related edges when service is off', () => {
    const visibility = { ...defaultUnitDiagramVisibility, service: false };
    const { nodes: outNodes, edges: outEdges } = applyComponentDiagramVisibility(nodes, edges, visibility);
    expect(outNodes.find((item) => item.id === 's')?.hidden).toBe(true);
    expect(outEdges.find((item) => item.id === 'e-service')?.hidden).toBe(true);
  });
});
