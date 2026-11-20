const versionTypeKeyByLower: Record<string, string> = {
  applicationversion: 'applicationVersion',
  componentversion: 'componentVersion',
  featureversion: 'featureVersion',
};

export const normalizeDiagramNodeTypeKey = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 'default';
  const lower = trimmed.toLowerCase();
  return versionTypeKeyByLower[lower] ?? lower;
};
