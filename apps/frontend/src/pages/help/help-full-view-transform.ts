export type HelpFullViewTransform = {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
};

export const HELP_FULL_VIEW_DEFAULT_TRANSFORM: HelpFullViewTransform = {
  scale: 1,
  x: 0,
  y: 0,
};

export const HELP_FULL_VIEW_SCALE_MIN = 0.5;
export const HELP_FULL_VIEW_SCALE_MAX = 3;
export const HELP_FULL_VIEW_SCALE_STEP = 0.25;

const FIT_PADDING = 48;
const FIT_SCALE_MIN = 0.1;

export const clampHelpFullViewScale = (scale: number): number => {
  if (scale < HELP_FULL_VIEW_SCALE_MIN) {
    return HELP_FULL_VIEW_SCALE_MIN;
  }
  if (scale > HELP_FULL_VIEW_SCALE_MAX) {
    return HELP_FULL_VIEW_SCALE_MAX;
  }
  return scale;
};

export const zoomHelpFullViewTransform = (
  transform: HelpFullViewTransform,
  nextScale: number,
  originX: number,
  originY: number,
): HelpFullViewTransform => {
  const scale = clampHelpFullViewScale(nextScale);
  const ratio = scale / transform.scale;
  return {
    scale,
    x: originX - (originX - transform.x) * ratio,
    y: originY - (originY - transform.y) * ratio,
  };
};

export const panHelpFullViewTransform = (
  transform: HelpFullViewTransform,
  deltaX: number,
  deltaY: number,
): HelpFullViewTransform => ({
  scale: transform.scale,
  x: transform.x + deltaX,
  y: transform.y + deltaY,
});

export const buildHelpFullViewFitTransform = (
  stageWidth: number,
  stageHeight: number,
  svgWidth: number,
  svgHeight: number,
): HelpFullViewTransform => {
  if (stageWidth <= 0 || stageHeight <= 0 || svgWidth <= 0 || svgHeight <= 0) {
    return HELP_FULL_VIEW_DEFAULT_TRANSFORM;
  }
  const rawScale = Math.min(
    (stageWidth - FIT_PADDING) / svgWidth,
    (stageHeight - FIT_PADDING) / svgHeight,
    1,
  );
  const scale = Math.max(rawScale, FIT_SCALE_MIN);
  return {
    scale,
    x: (stageWidth - svgWidth * scale) / 2,
    y: (stageHeight - svgHeight * scale) / 2,
  };
};
