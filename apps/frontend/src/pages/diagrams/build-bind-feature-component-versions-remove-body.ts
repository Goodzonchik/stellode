import type {
  BindFeatureComponentVersionsDto,
  FeatureComponentVersionBinding,
} from '@stellode/models';

export const buildBindFeatureComponentVersionsRemoveBody = (
  featureVersionId: string,
  binding: FeatureComponentVersionBinding,
): BindFeatureComponentVersionsDto => ({
  featureVersionId,
  remove: [binding],
});
