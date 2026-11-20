import type { DependsOnContextDto } from '@stellode/models';

export const buildInheritedFeatureDependsOnContext = (
  source: DependsOnContextDto,
  featureVersionId: string,
): DependsOnContextDto => {
  const sameFeature =
    source.consumerFeatureVersionId !== undefined &&
    source.providerFeatureVersionId !== undefined &&
    source.consumerFeatureVersionId === source.providerFeatureVersionId;
  return {
    ...source,
    consumerFeatureVersionId: featureVersionId,
    providerFeatureVersionId: sameFeature
      ? featureVersionId
      : source.providerFeatureVersionId,
  };
};
