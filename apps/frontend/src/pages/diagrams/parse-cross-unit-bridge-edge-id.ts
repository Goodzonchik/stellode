export const parseCrossUnitBridgeEdgeId = (
  edgeId: string,
): readonly [string, string] | null => {
  const prefix = 'CROSS_UNIT_LINK:';
  if (!edgeId.startsWith(prefix)) return null;
  const rest = edgeId.slice(prefix.length);
  const idx = rest.indexOf(':');
  if (idx <= 0 || idx >= rest.length - 1) return null;
  const a = rest.slice(0, idx);
  const b = rest.slice(idx + 1);
  if (!a || !b || b.includes(':')) return null;
  return [a, b] as const;
};
