import {
  HELP_FULL_VIEW_DEFAULT_TRANSFORM,
  type HelpFullViewTransform,
} from './help-full-view-transform';

const FIT_PADDING = 48;
const FIT_SCALE_MIN = 0.1;

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
