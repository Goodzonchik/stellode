import { clampHelpFullViewScale } from './clamp-help-full-view-scale';
import type { HelpFullViewTransform } from './help-full-view-transform';

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
