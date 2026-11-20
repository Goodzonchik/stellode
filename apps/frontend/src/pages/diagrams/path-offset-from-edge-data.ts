export const pathOffsetFromEdgeData = (data: unknown): number => {
  if (data === null || data === undefined || typeof data !== 'object') return 0;
  if (!('pathOffset' in data)) return 0;
  const value = (data as { pathOffset: unknown }).pathOffset;
  return typeof value === 'number' ? value : 0;
};
