import { buildBindFeatureComponentVersionsRemoveBody } from './build-bind-feature-component-versions-remove-body';

describe('buildBindFeatureComponentVersionsRemoveBody', () => {
  it('builds remove payload for one USES binding', () => {
    expect(
      buildBindFeatureComponentVersionsRemoveBody('fv-1', {
        componentVersionId: 'cv-1',
        applicationId: 'app-1',
      }),
    ).toEqual({
      featureVersionId: 'fv-1',
      remove: [{ componentVersionId: 'cv-1', applicationId: 'app-1' }],
    });
  });
});
