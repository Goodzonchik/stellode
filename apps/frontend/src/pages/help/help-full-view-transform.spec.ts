import {
  buildHelpFullViewFitTransform,
  clampHelpFullViewScale,
  HELP_FULL_VIEW_DEFAULT_TRANSFORM,
  HELP_FULL_VIEW_SCALE_MAX,
  HELP_FULL_VIEW_SCALE_MIN,
  panHelpFullViewTransform,
  zoomHelpFullViewTransform,
} from './help-full-view-transform';

describe('clampHelpFullViewScale', () => {
  it('keeps value in range', () => {
    expect(clampHelpFullViewScale(1)).toBe(1);
    expect(clampHelpFullViewScale(HELP_FULL_VIEW_SCALE_MIN - 1)).toBe(
      HELP_FULL_VIEW_SCALE_MIN,
    );
    expect(clampHelpFullViewScale(HELP_FULL_VIEW_SCALE_MAX + 1)).toBe(
      HELP_FULL_VIEW_SCALE_MAX,
    );
  });
});

describe('zoomHelpFullViewTransform', () => {
  it('keeps origin point stable when zooming', () => {
    const next = zoomHelpFullViewTransform(
      { scale: 1, x: 0, y: 0 },
      2,
      100,
      50,
    );
    expect(next.scale).toBe(2);
    expect(next.x).toBe(-100);
    expect(next.y).toBe(-50);
  });

  it('clamps scale to max', () => {
    const next = zoomHelpFullViewTransform(HELP_FULL_VIEW_DEFAULT_TRANSFORM, 99, 0, 0);
    expect(next.scale).toBe(3);
  });
});

describe('panHelpFullViewTransform', () => {
  it('shifts x and y by delta', () => {
    expect(panHelpFullViewTransform({ scale: 1.5, x: 10, y: 20 }, 5, -3)).toEqual({
      scale: 1.5,
      x: 15,
      y: 17,
    });
  });
});

describe('buildHelpFullViewFitTransform', () => {
  it('centers diagram in stage', () => {
    expect(buildHelpFullViewFitTransform(400, 300, 200, 100)).toEqual({
      scale: 1,
      x: 100,
      y: 100,
    });
  });

  it('scales down large diagram to fit', () => {
    const next = buildHelpFullViewFitTransform(400, 300, 800, 600);
    expect(next.scale).toBeLessThan(1);
    expect(next.x).toBeGreaterThan(0);
    expect(next.y).toBeGreaterThan(0);
  });

  it('returns default for invalid sizes', () => {
    expect(buildHelpFullViewFitTransform(0, 300, 200, 100)).toEqual(
      HELP_FULL_VIEW_DEFAULT_TRANSFORM,
    );
  });
});
