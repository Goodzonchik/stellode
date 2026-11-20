import type { DeleteDependsOnFromFeatureVersionsDto } from '@stellode/models';

type DeleteFeatureDependsOnParams = {
  readonly featureVersionId: string;
  readonly sourceComponentVersionId: string;
  readonly targetComponentVersionId: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
};

export const buildDeleteFeatureDependsOnDto = (
  p: DeleteFeatureDependsOnParams,
): DeleteDependsOnFromFeatureVersionsDto => ({
  sourceComponentVersionId: p.sourceComponentVersionId,
  targetComponentVersionId: p.targetComponentVersionId,
  consumerFeatureVersionId: p.featureVersionId,
  consumerApplicationId: p.consumerApplicationId,
  providerApplicationId: p.providerApplicationId,
});
