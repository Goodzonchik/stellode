import { pathOffsetFromEdgeData } from './path-offset-from-edge-data';

describe('pathOffsetFromEdgeData', () => {
  it('returns 0 for missing data', () => {
    expect(pathOffsetFromEdgeData(undefined)).toBe(0);
    expect(pathOffsetFromEdgeData(null)).toBe(0);
    expect(pathOffsetFromEdgeData({})).toBe(0);
  });

  it('reads numeric pathOffset', () => {
    expect(pathOffsetFromEdgeData({ pathOffset: -24 })).toBe(-24);
  });
});
