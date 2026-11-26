import type { ViewNode } from '@stellode/models';
import { isGroupNodeUnitType } from './is-group-node-unit-type';

export type UnitGroupAccentCssVars = {
  readonly '--group-node-accent': string;
  readonly '--group-node-bg': string;
  readonly '--group-node-header-bg': string;
  readonly '--group-node-header-border': string;
};

export const unitGroupAccentHash = (unitId: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < unitId.length; index += 1) {
    hash ^= unitId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const unitGroupAccentHue = (unitId: string): number => unitGroupAccentHash(unitId) % 360;

export const resolveUnitGroupAccentKey = (id: string, data: ViewNode['data']): string =>
  data.unitId ?? id;

export const buildUnitGroupAccentCssVars = (unitId: string): UnitGroupAccentCssVars => {
  const hue = unitGroupAccentHue(unitId);
  return {
    '--group-node-accent': `hsl(${hue} 72% 36%)`,
    '--group-node-bg': `hsl(${hue} 72% 45% / 0.1)`,
    '--group-node-header-bg': `hsl(${hue} 72% 45% / 0.2)`,
    '--group-node-header-border': `hsl(${hue} 72% 36% / 0.65)`,
  };
};

export const buildGroupNodeUnitAccentStyle = (
  id: string,
  data: ViewNode['data'],
): UnitGroupAccentCssVars | undefined => {
  if (!isGroupNodeUnitType(data.type)) return undefined;
  return buildUnitGroupAccentCssVars(resolveUnitGroupAccentKey(id, data));
};
