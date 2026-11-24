import type { HelpFullViewTransform } from './help-full-view-transform';

export const panHelpFullViewTransform = (
  transform: HelpFullViewTransform,
  deltaX: number,
  deltaY: number,
): HelpFullViewTransform => ({
  scale: transform.scale,
  x: transform.x + deltaX,
  y: transform.y + deltaY,
});
