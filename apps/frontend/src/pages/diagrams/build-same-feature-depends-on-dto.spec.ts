import { buildSameFeatureDependsOnDto } from './build-same-feature-depends-on-dto';

describe('buildSameFeatureDependsOnDto', () => {
  it('uses the same FeatureVersion on both sides', () => {
    expect(
      buildSameFeatureDependsOnDto({
        featureVersionId: 'fv-1',
        consumerCvId: 'cv-a',
        consumerApplicationId: 'app-a',
        providerCvId: 'cv-b',
        providerApplicationId: 'app-b',
      }),
    ).toEqual({
      sourceComponentVersionId: 'cv-a',
      targetComponentVersionId: 'cv-b',
      consumerFeatureVersionId: 'fv-1',
      providerFeatureVersionId: 'fv-1',
      consumerApplicationId: 'app-a',
      providerApplicationId: 'app-b',
    });
  });
});
