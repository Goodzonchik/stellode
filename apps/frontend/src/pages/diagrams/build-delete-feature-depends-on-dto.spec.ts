import { buildDeleteFeatureDependsOnDto } from './build-delete-feature-depends-on-dto';

describe('buildDeleteFeatureDependsOnDto', () => {
  it('maps fields to delete DTO', () => {
    expect(
      buildDeleteFeatureDependsOnDto({
        featureVersionId: 'fv-1',
        sourceComponentVersionId: 'cv-a',
        targetComponentVersionId: 'cv-b',
        consumerApplicationId: 'app-a',
        providerApplicationId: 'app-b',
      }),
    ).toEqual({
      sourceComponentVersionId: 'cv-a',
      targetComponentVersionId: 'cv-b',
      consumerFeatureVersionId: 'fv-1',
      consumerApplicationId: 'app-a',
      providerApplicationId: 'app-b',
    });
  });
});
