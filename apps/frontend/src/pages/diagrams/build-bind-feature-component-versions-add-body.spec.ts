import { buildBindFeatureComponentVersionsAddBody } from './build-bind-feature-component-versions-add-body';

describe('buildBindFeatureComponentVersionsAddBody', () => {
  it('builds add payload for one USES binding', () => {
    expect(
      buildBindFeatureComponentVersionsAddBody('fv-1', {
        componentVersionId: 'cv-1',
        applicationId: 'app-1',
      }),
    ).toEqual({
      featureVersionId: 'fv-1',
      add: [{ componentVersionId: 'cv-1', applicationId: 'app-1' }],
    });
  });
});
