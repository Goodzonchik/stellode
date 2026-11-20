import type { DependsOnContextDto } from '@stellode/models';

export const isRaiseDependsOnSourceEdge = (
  context: DependsOnContextDto,
  applicationId: string,
  featureVersionId: string,
): boolean => {
  if (context.consumerApplicationId === applicationId) return true;
  return (
    context.consumerApplicationId === undefined &&
    context.consumerFeatureVersionId === featureVersionId
  );
};
