import type { ViewEdge, ViewNode } from '@stellode/models';
import {
  collectFeatureVersionCompositionNodeIds,
  isFeatureVersionCompositionNode,
} from './collect-feature-version-composition-node-ids';

const node = (
  id: string,
  dataType: string,
  extras: Partial<ViewNode['data']> = {},
  parentId?: string,
): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...(parentId !== undefined ? { parentId } : {}),
  data: { label: id, type: dataType, ...extras },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType = 'USES_COMPONENT_VERSION',
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('collectFeatureVersionCompositionNodeIds', () => {
  it('collects USES targets and nested copies by sourceId', () => {
    const nodes = [
      node('fv', 'featureVersion'),
      node('cv', 'component', { unitId: 'u1' }),
      node('app::cv', 'component', { unitId: 'u1', sourceId: 'cv' }, 'app'),
    ];
    const edges = [edge('u', 'fv', 'app::cv')];
    const ids = collectFeatureVersionCompositionNodeIds(nodes, edges);
    expect(ids.has('app::cv')).toBe(true);
    expect(ids.has('cv')).toBe(true);
    expect(isFeatureVersionCompositionNode(nodes[2]!, ids)).toBe(true);
  });

  it('collects composition when USES is oriented ComponentVersion → FeatureVersion', () => {
    const nodes = [
      node('fv', 'featureVersion'),
      node('cv', 'component', { unitId: 'u1' }),
    ];
    const edges = [edge('u', 'cv', 'fv')];
    const ids = collectFeatureVersionCompositionNodeIds(nodes, edges, ['fv']);
    expect([...ids]).toEqual(['cv']);
  });

  it('ignores USES of other FeatureVersions when featureVersionIds are set', () => {
    const nodes = [
      node('fv', 'featureVersion'),
      node('other-fv', 'featureVersion'),
      node('local', 'component', { unitId: 'u1' }),
      node('remote', 'component', { unitId: 'u2' }),
    ];
    const edges = [
      edge('u-local', 'local', 'fv'),
      edge('u-remote', 'remote', 'other-fv'),
    ];
    const ids = collectFeatureVersionCompositionNodeIds(nodes, edges, ['fv']);
    expect([...ids]).toEqual(['local']);
  });
});
