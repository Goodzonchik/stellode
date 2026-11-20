import { buildListHighlightSearch } from './build-list-highlight-search';

describe('buildListHighlightSearch', () => {
  it('sets highlight without ctx', () => {
    expect(buildListHighlightSearch({ highlight: 'app-1' })).toBe('highlight=app-1');
  });

  it('serializes ctx keys as ctx.<key>', () => {
    expect(
      buildListHighlightSearch({
        highlight: 'cmp-1',
        ctx: { unitId: 'unit-1', teamId: 'team-1' },
      }),
    ).toBe('highlight=cmp-1&ctx.unitId=unit-1&ctx.teamId=team-1');
  });

  it('skips empty ctx values', () => {
    expect(
      buildListHighlightSearch({
        highlight: 'app-1',
        ctx: { unitId: '', teamId: 't1' },
      }),
    ).toBe('highlight=app-1&ctx.teamId=t1');
  });

  it('encodes special characters', () => {
    expect(buildListHighlightSearch({ highlight: 'a/b' })).toBe('highlight=a%2Fb');
  });
});
