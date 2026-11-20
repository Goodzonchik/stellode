import type { ViewEdge, ViewNode } from '@stellode/models';

type DependsOnApps = {
  readonly consumerApplicationId: string | undefined;
  readonly providerApplicationId: string | undefined;
};

export const resolveEdgeDependsOnApps = (
  edge: Pick<ViewEdge, 'consumerApplicationId' | 'providerApplicationId'>,
  sourceNode: Pick<ViewNode, 'data'> | undefined,
  targetNode: Pick<ViewNode, 'data'> | undefined,
): DependsOnApps => ({
  consumerApplicationId: edge.consumerApplicationId ?? sourceNode?.data.applicationId,
  providerApplicationId: edge.providerApplicationId ?? targetNode?.data.applicationId,
});
