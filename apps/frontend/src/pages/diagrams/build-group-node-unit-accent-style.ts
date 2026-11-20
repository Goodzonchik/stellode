import type { ViewNode } from '@stellode/models';
import { buildUnitGroupAccentCssVars } from './build-unit-group-accent-css-vars';
import { isGroupNodeUnitType } from './is-group-node-unit-type';
import { resolveUnitGroupAccentKey } from './resolve-unit-group-accent-key';
import type { UnitGroupAccentCssVars } from './unit-group-accent-css-vars';

export const buildGroupNodeUnitAccentStyle = (
  id: string,
  data: ViewNode['data'],
): UnitGroupAccentCssVars | undefined => {
  if (!isGroupNodeUnitType(data.type)) return undefined;
  return buildUnitGroupAccentCssVars(resolveUnitGroupAccentKey(id, data));
};
