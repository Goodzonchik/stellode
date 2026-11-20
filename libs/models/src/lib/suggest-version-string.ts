export const suggestNextComponentOrFeatureVersionString = (
  maxVersionNumber: number | null | undefined,
): string => {
  if (maxVersionNumber === null || maxVersionNumber === undefined || maxVersionNumber < 0) {
    return '0';
  }
  return String(maxVersionNumber + 1);
};

export const suggestNextApplicationVersionString = (
  currentVersionNumber: number | null | undefined,
): string => {
  if (currentVersionNumber === null || currentVersionNumber === undefined) {
    return '1';
  }
  return String(currentVersionNumber + 1);
};
