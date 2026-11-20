import { filterComponents } from './filter-components';
import type { ComponentNode } from './component-node';

const teamAlpha = { id: 'team-a', name: 'Alpha' };
const teamBeta = { id: 'team-b', name: 'Beta' };

const ownAlpha: ComponentNode = {
  id: 'c1',
  name: 'Auth Service',
  description: null,
  isDependency: false,
  isPublic: false,
  team: teamAlpha,
};

const depBeta: ComponentNode = {
  id: 'c2',
  name: 'auth-lib',
  description: null,
  isDependency: true,
  isPublic: true,
  team: teamBeta,
};

const ownNoTeam: ComponentNode = {
  id: 'c3',
  name: 'Orphan',
  description: null,
  isDependency: false,
  isPublic: false,
  team: null,
};

const all = [ownAlpha, depBeta, ownNoTeam];

describe('filterComponents', () => {
  it('filters by name substring case-insensitively after trim', () => {
    expect(filterComponents(all, '  AUTH  ', '', '')).toEqual([ownAlpha, depBeta]);
  });

  it('filters by team id', () => {
    expect(filterComponents(all, '', 'team-a', '')).toEqual([ownAlpha]);
  });

  it('hides components without team when team filter is set', () => {
    expect(filterComponents(all, '', 'team-b', '')).toEqual([depBeta]);
  });

  it('keeps components without team when team filter is cleared', () => {
    expect(filterComponents(all, '', '', '')).toEqual(all);
  });

  it('filters by type own', () => {
    expect(filterComponents(all, '', '', 'own')).toEqual([ownAlpha, ownNoTeam]);
  });

  it('filters by type dependency', () => {
    expect(filterComponents(all, '', '', 'dependency')).toEqual([depBeta]);
  });

  it('combines filters with AND', () => {
    expect(filterComponents(all, 'auth', 'team-a', 'own')).toEqual([ownAlpha]);
  });

  it('returns empty list when nothing matches', () => {
    expect(filterComponents(all, 'zzz', '', '')).toEqual([]);
  });
});
