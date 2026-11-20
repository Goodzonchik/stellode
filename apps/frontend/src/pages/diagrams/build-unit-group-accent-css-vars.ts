import type { UnitGroupAccentCssVars } from './unit-group-accent-css-vars';
import { unitGroupAccentHue } from './unit-group-accent-hue';

export const buildUnitGroupAccentCssVars = (unitId: string): UnitGroupAccentCssVars => {
  const hue = unitGroupAccentHue(unitId);
  return {
    '--group-node-accent': `hsl(${hue} 72% 36%)`,
    '--group-node-bg': `hsl(${hue} 72% 45% / 0.1)`,
    '--group-node-header-bg': `hsl(${hue} 72% 45% / 0.2)`,
    '--group-node-header-border': `hsl(${hue} 72% 36% / 0.65)`,
  };
};
