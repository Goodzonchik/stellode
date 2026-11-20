import type { RaiseComponentVersionCandidate } from './filter-raise-component-version-candidates';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const parseComponentVersionListRows = (
  payload: unknown,
): RaiseComponentVersionCandidate[] => {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((row) => {
      const record = asRecord(row);
      if (!record) return null;
      const id = typeof record.id === 'string' ? record.id : '';
      const version = typeof record.version === 'string' ? record.version : '';
      const versionNumber = Number(record.versionNumber);
      const status = typeof record.status === 'string' ? record.status : '';
      if (!id || !Number.isFinite(versionNumber) || !status) return null;
      return { id, version: version || String(versionNumber), versionNumber, status };
    })
    .filter((row): row is RaiseComponentVersionCandidate => row !== null);
};
