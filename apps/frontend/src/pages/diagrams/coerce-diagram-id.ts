export const coerceDiagramId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value === null || value === undefined) return undefined;
  const asString = String(value);
  return asString !== '' && asString !== 'undefined' && asString !== 'null'
    ? asString
    : undefined;
};
