import { HELP_FULL_VIEW_DEFAULT_TRANSFORM } from './help-full-view-transform';
import { zoomHelpFullViewTransform } from './zoom-help-full-view-transform';

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
