const impactBucketKeys = [
  'units',
  'teams',
  'services',
  'features',
  'applications',
  'components',
  'consumers',
  'providers',
] as const;

const idsFromItem = (item: unknown): string[] => {
  if (typeof item !== 'object' || item === null) return [];
  const id = (item as { id?: unknown }).id;
  return typeof id === 'string' ? [id] : [];
};

const collectIdsFromList = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.flatMap(idsFromItem) : [];

export const collectImpactHighlightIds = (raw: unknown): Set<string> => {
  if (typeof raw !== 'object' || raw === null) return new Set();
  const record = raw as Record<string, unknown>;
  const ids = impactBucketKeys.flatMap((key) => collectIdsFromList(record[key]));
  return new Set(ids);
};
