import type {
  BindFeatureComponentVersionsDto,
  FeatureComponentVersionBinding,
} from '@stellode/models';

export const buildBindFeatureComponentVersionsAddBody = (
  featureVersionId: string,
  binding: FeatureComponentVersionBinding,
): BindFeatureComponentVersionsDto => ({
  featureVersionId,
  add: [binding],
});
