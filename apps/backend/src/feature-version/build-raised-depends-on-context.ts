import type { DependsOnContextDto } from '@stellode/models';

export const buildRaisedDependsOnContext = (
  source: DependsOnContextDto,
  featureVersionId: string,
  applicationId: string,
): DependsOnContextDto => {
  const sameFeature =
    source.consumerFeatureVersionId !== undefined &&
    source.providerFeatureVersionId !== undefined &&
    source.consumerFeatureVersionId === source.providerFeatureVersionId;
  return {
    ...source,
    consumerApplicationId: applicationId,
    consumerFeatureVersionId: featureVersionId,
    providerFeatureVersionId: sameFeature
      ? featureVersionId
      : source.providerFeatureVersionId,
  };
};
