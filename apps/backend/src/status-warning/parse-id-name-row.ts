import type { IdNameRow } from './merge-id-name-rows';

export const parseIdNameRow = (idRaw: unknown, nameRaw: unknown): IdNameRow | null => {
  if (typeof idRaw !== 'string' || idRaw.length === 0) return null;
  if (typeof nameRaw !== 'string') return null;
  return { id: idRaw, name: nameRaw };
};
