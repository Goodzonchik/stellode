import type { ViewNode } from '@stellode/models';

export const resolveUnitGroupAccentKey = (id: string, data: ViewNode['data']): string =>
  data.unitId ?? id;
