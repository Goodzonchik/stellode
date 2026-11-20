import { unitGroupAccentHash } from './unit-group-accent-hash';

export const unitGroupAccentHue = (unitId: string): number => unitGroupAccentHash(unitId) % 360;
