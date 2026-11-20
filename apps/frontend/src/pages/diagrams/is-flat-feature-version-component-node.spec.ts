import type { ViewNode } from '@stellode/models';
import { isFlatFeatureVersionComponentNode } from './is-flat-feature-version-component-node';

const node = (id: string, dataType: string, parentId?: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...(parentId !== undefined ? { parentId } : {}),
  data: { label: id, type: dataType },
});

describe('isFlatFeatureVersionComponentNode', () => {
  it('returns true for component without parentId', () => {
    expect(isFlatFeatureVersionComponentNode(node('c', 'component'))).toBe(true);
  });

  it('returns true for dependency without parentId', () => {
    expect(isFlatFeatureVersionComponentNode(node('d', 'dependency'))).toBe(true);
  });

  it('returns false when nested in Application', () => {
    expect(isFlatFeatureVersionComponentNode(node('c', 'component', 'app-1'))).toBe(false);
  });

  it('returns false for team', () => {
    expect(isFlatFeatureVersionComponentNode(node('t', 'team'))).toBe(false);
  });
});
