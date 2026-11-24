import { buildHelpFullViewFitTransform } from './build-help-full-view-fit-transform';
import { HELP_FULL_VIEW_DEFAULT_TRANSFORM } from './help-full-view-transform';

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
