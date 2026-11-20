export const resolveUnitsNavUnitName = (
  unitName: string | null | undefined
): string | null => {
  const trimmed = (unitName ?? '').trim();
  return trimmed === '' ? null : trimmed;
};
