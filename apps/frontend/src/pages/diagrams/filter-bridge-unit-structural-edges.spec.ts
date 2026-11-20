import type { ViewEdge } from '@stellode/models';
import { filterBridgeUnitStructuralEdges } from './filter-bridge-unit-structural-edges';

const edge = (id: string, relationshipType: string): ViewEdge => ({
  id,
  source: 'a',
  target: 'b',
  type: 'default',
  relationshipType,
});

describe('filterBridgeUnitStructuralEdges', () => {
  it('removes HAS_TEAM, PROVIDES and OWNS', () => {
    const edges = [
      edge('has-team', 'HAS_TEAM'),
      edge('provides', 'PROVIDES'),
      edge('owns', 'OWNS'),
      edge('dep', 'DEPENDS_ON'),
    ];
    expect(filterBridgeUnitStructuralEdges(edges).map((item) => item.id)).toEqual(['dep']);
  });

  it('keeps AGGREGATES, MAINTAINS and USES', () => {
    const edges = [
      edge('agg', 'AGGREGATES'),
      edge('maintains', 'MAINTAINS'),
      edge('uses', 'USES'),
    ];
    expect(filterBridgeUnitStructuralEdges(edges)).toHaveLength(3);
  });
});
