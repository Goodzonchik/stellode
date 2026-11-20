import type { RaiseFeatureComponentVersionDto } from '@stellode/models';

export const buildRaiseFeatureComponentVersionBody = (
  featureVersionId: string,
  fromComponentVersionId: string,
  applicationId: string,
  toComponentVersionId?: string,
): RaiseFeatureComponentVersionDto => ({
  featureVersionId,
  fromComponentVersionId,
  applicationId,
  ...(toComponentVersionId !== undefined ? { toComponentVersionId } : {}),
});
