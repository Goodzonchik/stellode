export type PinApplicationIdSource = {
  readonly applicationId: string;
};

export const collectPinApplicationIds = (
  usesSources: readonly PinApplicationIdSource[],
  providerSources: readonly PinApplicationIdSource[],
): readonly string[] => {
  const ids = new Set<string>();
  for (const source of usesSources) {
    const id = source.applicationId.trim();
    if (id.length > 0) ids.add(id);
  }
  for (const source of providerSources) {
    const id = source.applicationId.trim();
    if (id.length > 0) ids.add(id);
  }
  return [...ids].sort();
};
