const uuidParamPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const resolveCrossUnitCenterUnitId = (
  fromUnit: string | null,
  contextUnitId: string | undefined,
): string | null => {
  const trimmed = fromUnit?.trim() ?? '';
  if (trimmed.length > 0 && uuidParamPattern.test(trimmed)) {
    return trimmed;
  }
  const context = contextUnitId?.trim() ?? '';
  return context.length > 0 ? context : null;
};
