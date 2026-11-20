import type { CreateDependsOnFromFeatureVersionsDto } from '@stellode/models';

type SameFeatureDependsOnParams = {
  readonly featureVersionId: string;
  readonly consumerCvId: string;
  readonly consumerApplicationId: string;
  readonly providerCvId: string;
  readonly providerApplicationId: string;
};

export const buildSameFeatureDependsOnDto = (
  p: SameFeatureDependsOnParams,
): CreateDependsOnFromFeatureVersionsDto => ({
  sourceComponentVersionId: p.consumerCvId,
  targetComponentVersionId: p.providerCvId,
  consumerFeatureVersionId: p.featureVersionId,
  providerFeatureVersionId: p.featureVersionId,
  consumerApplicationId: p.consumerApplicationId,
  providerApplicationId: p.providerApplicationId,
});
