export const shouldBindComponentToFeatureVersion = (
  entity: string | undefined,
  featureVersionId: string | undefined,
): boolean => {
  if (entity !== 'feature-version') return false;
  return typeof featureVersionId === 'string' && featureVersionId.length > 0;
};
