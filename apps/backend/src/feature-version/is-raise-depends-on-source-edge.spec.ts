import { isRaiseDependsOnSourceEdge } from './is-raise-depends-on-source-edge';

describe('isRaiseDependsOnSourceEdge', () => {
  it('matches same applicationId', () => {
    expect(
      isRaiseDependsOnSourceEdge(
        { consumerApplicationId: 'app-a', consumerFeatureVersionId: 'fv-other' },
        'app-a',
        'fv-draft',
      ),
    ).toBe(true);
  });

  it('matches legacy edge without applicationId for current FV', () => {
    expect(
      isRaiseDependsOnSourceEdge(
        { consumerFeatureVersionId: 'fv-draft' },
        'app-a',
        'fv-draft',
      ),
    ).toBe(true);
  });

  it('rejects other application', () => {
    expect(
      isRaiseDependsOnSourceEdge(
        { consumerApplicationId: 'app-b', consumerFeatureVersionId: 'fv-draft' },
        'app-a',
        'fv-draft',
      ),
    ).toBe(false);
  });
});
