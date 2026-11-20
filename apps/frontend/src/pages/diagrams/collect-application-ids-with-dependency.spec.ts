import type { ViewNode } from '@stellode/models';
import type { ApplicationGrouping } from './application-grouping-types';
import { collectApplicationIdsWithDependency } from './collect-application-ids-with-dependency';

const viewNode = (id: string, type: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type },
});

const grouping = (
  membershipsByChild: ReadonlyMap<string, ReadonlyMap<string, string | undefined>>,
): ApplicationGrouping => ({
  membershipsByChild,
  collapsedVersionToApplication: new Map(),
});

describe('collectApplicationIdsWithDependency', () => {
  it('returns empty set when no dependency members', () => {
    const nodes = [viewNode('c', 'component')];
    const result = collectApplicationIdsWithDependency(
      nodes,
      grouping(new Map([['c', new Map([['app', 'active']])]])),
    );
    expect([...result]).toEqual([]);
  });

  it('returns application ids that contain a dependency member', () => {
    const nodes = [viewNode('dep', 'dependency'), viewNode('c', 'component')];
    const result = collectApplicationIdsWithDependency(
      nodes,
      grouping(
        new Map([
          ['dep', new Map([['app-a', 'active'], ['app-b', undefined]])],
          ['c', new Map([['app-a', 'active']])],
        ]),
      ),
    );
    expect([...result].sort()).toEqual(['app-a', 'app-b']);
  });
});
