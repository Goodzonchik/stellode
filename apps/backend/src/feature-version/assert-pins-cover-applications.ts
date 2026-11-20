export type ApplicationVersionPin = {
  readonly applicationId: string;
  readonly applicationVersionId: string;
};

export const assertPinsCoverApplications = (
  requiredApplicationIds: readonly string[],
  pins: readonly ApplicationVersionPin[],
): readonly ApplicationVersionPin[] => {
  const byApp = new Map<string, string>();
  for (const pin of pins) {
    if (pin.applicationId.trim().length === 0) continue;
    if (pin.applicationVersionId.trim().length === 0) continue;
    byApp.set(pin.applicationId, pin.applicationVersionId);
  }
  const missing = requiredApplicationIds.filter((id) => !byApp.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Cannot pin ApplicationVersion: missing current release for applications: ${missing.join(', ')}`,
    );
  }
  return requiredApplicationIds.map((applicationId) => ({
    applicationId,
    applicationVersionId: byApp.get(applicationId) as string,
  }));
};
