import type { ApiNodeBase } from './entities';

export const UnitEntityType = {
  Unit: 'unit',
} as const;

export type UnitEntityType = (typeof UnitEntityType)[keyof typeof UnitEntityType];

export type UnitEntity = ApiNodeBase<UnitEntityType> & {
  description?: string;
};
