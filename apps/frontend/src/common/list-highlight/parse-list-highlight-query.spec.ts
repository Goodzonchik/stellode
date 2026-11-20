import { parseListHighlightQuery } from './parse-list-highlight-query';

describe('parseListHighlightQuery', () => {
  it('returns null highlight and empty ctx when params are empty', () => {
    expect(parseListHighlightQuery(new URLSearchParams())).toEqual({
      highlightId: null,
      ctx: {},
    });
  });

  it('reads highlight and ctx.* keys', () => {
    const params = new URLSearchParams(
      'highlight=cmp-1&ctx.unitId=unit-1&ctx.teamId=team-1&other=x',
    );
    expect(parseListHighlightQuery(params)).toEqual({
      highlightId: 'cmp-1',
      ctx: { unitId: 'unit-1', teamId: 'team-1' },
    });
  });

  it('treats blank highlight as null', () => {
    expect(parseListHighlightQuery(new URLSearchParams('highlight=%20'))).toEqual({
      highlightId: null,
      ctx: {},
    });
  });
});
