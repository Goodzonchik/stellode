import type { ViewEdge, ViewNode } from '@stellode/models';
import { collectFeatureVersionCrossUnitIds } from './collect-feature-version-cross-unit-ids';

const node = (id: string, dataType: string, unitId?: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: dataType, ...(unitId !== undefined ? { unitId } : {}) },
});

const edge = (id: string, source: string, target: string, relationshipType: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('collectFeatureVersionCrossUnitIds', () => {
  it('returns empty set when DEPENDS_ON is same-unit', () => {
    const nodes = [node('c1', 'component', 'u1'), node('c2', 'component', 'u1')];
    const edges = [edge('d', 'c1', 'c2', 'DEPENDS_ON')];
    expect([...collectFeatureVersionCrossUnitIds(nodes, edges)]).toEqual([]);
  });

  it('returns both unit ids for cross-unit DEPENDS_ON', () => {
    const nodes = [node('c1', 'component', 'u1'), node('c2', 'dependency', 'u2')];
    const edges = [edge('d', 'c1', 'c2', 'DEPENDS_ON')];
    expect([...collectFeatureVersionCrossUnitIds(nodes, edges)].sort()).toEqual(['u1', 'u2']);
  });

  it('ignores non-DEPENDS_ON edges', () => {
    const nodes = [node('c1', 'component', 'u1'), node('c2', 'component', 'u2')];
    const edges = [edge('u', 'c1', 'c2', 'USES_COMPONENT_VERSION')];
    expect([...collectFeatureVersionCrossUnitIds(nodes, edges)]).toEqual([]);
  });
});
