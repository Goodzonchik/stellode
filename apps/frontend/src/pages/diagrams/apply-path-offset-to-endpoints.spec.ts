import { applyPathOffsetToEndpoints } from './apply-path-offset-to-endpoints';

describe('applyPathOffsetToEndpoints', () => {
  it('returns the same endpoints when offset is 0', () => {
    const endpoints = { sourceX: 0, sourceY: 0, targetX: 10, targetY: 0 };
    expect(applyPathOffsetToEndpoints(endpoints, 0)).toBe(endpoints);
  });

  it('shifts a horizontal edge along the perpendicular', () => {
    expect(
      applyPathOffsetToEndpoints({ sourceX: 0, sourceY: 0, targetX: 10, targetY: 0 }, 5),
    ).toEqual({ sourceX: 0, sourceY: 5, targetX: 10, targetY: 5 });
  });
});
