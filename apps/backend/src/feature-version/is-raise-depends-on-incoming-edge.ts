import type { DependsOnContextDto } from '@stellode/models';

export const isRaiseDependsOnIncomingEdge = (
  context: DependsOnContextDto,
  applicationId: string,
  featureVersionId: string,
): boolean => {
  if (context.consumerFeatureVersionId !== featureVersionId) return false;
  if (context.providerApplicationId === applicationId) return true;
  return context.providerApplicationId === undefined;
};
