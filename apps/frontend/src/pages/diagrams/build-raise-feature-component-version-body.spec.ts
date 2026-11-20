import { buildRaiseFeatureComponentVersionBody } from './build-raise-feature-component-version-body';

describe('buildRaiseFeatureComponentVersionBody', () => {
  it('omits toComponentVersionId when not provided', () => {
    expect(buildRaiseFeatureComponentVersionBody('fv', 'cv1', 'app')).toEqual({
      featureVersionId: 'fv',
      fromComponentVersionId: 'cv1',
      applicationId: 'app',
    });
  });

  it('includes toComponentVersionId when provided', () => {
    expect(buildRaiseFeatureComponentVersionBody('fv', 'cv1', 'app', 'cv2')).toEqual({
      featureVersionId: 'fv',
      fromComponentVersionId: 'cv1',
      applicationId: 'app',
      toComponentVersionId: 'cv2',
    });
  });
});
