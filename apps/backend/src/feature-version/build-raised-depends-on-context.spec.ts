import { buildRaisedDependsOnContext } from './build-raised-depends-on-context';

describe('buildRaisedDependsOnContext', () => {
  it('rewrites consumer FV and applicationId', () => {
    const result = buildRaisedDependsOnContext(
      {
        consumerApplicationId: 'app-old',
        consumerFeatureVersionId: 'fv-old',
        providerFeatureVersionId: 'fv-provider',
        providerApplicationId: 'app-p',
      },
      'fv-new',
      'app-1',
    );
    expect(result.consumerApplicationId).toBe('app-1');
    expect(result.consumerFeatureVersionId).toBe('fv-new');
    expect(result.providerFeatureVersionId).toBe('fv-provider');
  });

  it('rewrites provider FV when same-feature', () => {
    const result = buildRaisedDependsOnContext(
      {
        consumerFeatureVersionId: 'fv-old',
        providerFeatureVersionId: 'fv-old',
      },
      'fv-new',
      'app-1',
    );
    expect(result.providerFeatureVersionId).toBe('fv-new');
    expect(result.consumerFeatureVersionId).toBe('fv-new');
  });
});
