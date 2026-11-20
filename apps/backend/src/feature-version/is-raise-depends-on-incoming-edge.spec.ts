import { isRaiseDependsOnIncomingEdge } from './is-raise-depends-on-incoming-edge';

describe('isRaiseDependsOnIncomingEdge', () => {
  it('matches same draft and provider applicationId', () => {
    expect(
      isRaiseDependsOnIncomingEdge(
        {
          consumerFeatureVersionId: 'fv-draft',
          providerApplicationId: 'app-a',
          consumerApplicationId: 'app-b',
        },
        'app-a',
        'fv-draft',
      ),
    ).toBe(true);
  });

  it('matches legacy edge without providerApplicationId for current FV', () => {
    expect(
      isRaiseDependsOnIncomingEdge(
        { consumerFeatureVersionId: 'fv-draft', consumerApplicationId: 'app-b' },
        'app-a',
        'fv-draft',
      ),
    ).toBe(true);
  });

  it('rejects other feature version', () => {
    expect(
      isRaiseDependsOnIncomingEdge(
        {
          consumerFeatureVersionId: 'fv-other',
          providerApplicationId: 'app-a',
        },
        'app-a',
        'fv-draft',
      ),
    ).toBe(false);
  });

  it('rejects other provider application', () => {
    expect(
      isRaiseDependsOnIncomingEdge(
        {
          consumerFeatureVersionId: 'fv-draft',
          providerApplicationId: 'app-b',
        },
        'app-a',
        'fv-draft',
      ),
    ).toBe(false);
  });
});
