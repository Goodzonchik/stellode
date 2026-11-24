import {
  clampHelpFullViewScale,
  HELP_FULL_VIEW_SCALE_MAX,
  HELP_FULL_VIEW_SCALE_MIN,
} from './clamp-help-full-view-scale';

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
