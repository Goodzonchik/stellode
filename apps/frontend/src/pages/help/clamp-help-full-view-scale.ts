export const HELP_FULL_VIEW_SCALE_MIN = 0.5;
export const HELP_FULL_VIEW_SCALE_MAX = 3;
export const HELP_FULL_VIEW_SCALE_STEP = 0.25;

export const clampHelpFullViewScale = (scale: number): number => {
  if (scale < HELP_FULL_VIEW_SCALE_MIN) {
    return HELP_FULL_VIEW_SCALE_MIN;
  }
  if (scale > HELP_FULL_VIEW_SCALE_MAX) {
    return HELP_FULL_VIEW_SCALE_MAX;
  }
  return scale;
};
