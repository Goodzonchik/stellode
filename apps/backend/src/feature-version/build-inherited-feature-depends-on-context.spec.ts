import { buildInheritedFeatureDependsOnContext } from './build-inherited-feature-depends-on-context';

describe('buildInheritedFeatureDependsOnContext', () => {
  it('rewrites consumerFeatureVersionId and keeps apps', () => {
    expect(
      buildInheritedFeatureDependsOnContext(
        {
          consumerApplicationId: 'app-a',
          providerApplicationId: 'app-b',
          consumerFeatureVersionId: 'fv-old',
          providerFeatureVersionId: 'fv-other',
        },
        'fv-new',
      ),
    ).toEqual({
      consumerApplicationId: 'app-a',
      providerApplicationId: 'app-b',
      consumerFeatureVersionId: 'fv-new',
      providerFeatureVersionId: 'fv-other',
    });
  });

  it('rewrites both FV ids for same-feature edges', () => {
    expect(
      buildInheritedFeatureDependsOnContext(
        {
          consumerFeatureVersionId: 'fv-old',
          providerFeatureVersionId: 'fv-old',
        },
        'fv-new',
      ),
    ).toEqual({
      consumerFeatureVersionId: 'fv-new',
      providerFeatureVersionId: 'fv-new',
    });
  });
});
