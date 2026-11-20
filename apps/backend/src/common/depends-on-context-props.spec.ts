import {
  dependsOnContextProps,
  dependsOnContextsEqual,
  dependsOnMatchKeyParams,
  dependsOnMatchKeysWhere,
} from './depends-on-context-props';

describe('dependsOnContextProps', () => {
  it('keeps only non-empty string fields', () => {
    expect(
      dependsOnContextProps({
        consumerApplicationId: 'app-1',
        consumerFeatureVersionId: '',
        providerApplicationId: 'app-2',
      }),
    ).toEqual({
      consumerApplicationId: 'app-1',
      providerApplicationId: 'app-2',
    });
  });
});

describe('dependsOnMatchKeysWhere', () => {
  it('builds property equality for match keys', () => {
    expect(dependsOnMatchKeysWhere('r')).toContain('r.consumerFeatureVersionId = $consumerFeatureVersionId');
    expect(dependsOnMatchKeysWhere('r')).toContain('r.consumerApplicationId = $consumerApplicationId');
    expect(dependsOnMatchKeysWhere('r')).toContain('r.providerApplicationId = $providerApplicationId');
  });
});

describe('dependsOnMatchKeyParams', () => {
  it('extracts match keys with empty defaults', () => {
    expect(dependsOnMatchKeyParams({ consumerApplicationId: 'a' })).toEqual({
      consumerFeatureVersionId: '',
      consumerApplicationId: 'a',
      providerApplicationId: '',
    });
  });
});

describe('dependsOnContextsEqual', () => {
  it('compares all context fields', () => {
    expect(
      dependsOnContextsEqual(
        { consumerFeatureVersionId: 'fv-1' },
        { consumerFeatureVersionId: 'fv-1' },
      ),
    ).toBe(true);
    expect(
      dependsOnContextsEqual(
        { consumerFeatureVersionId: 'fv-1' },
        { consumerFeatureVersionId: 'fv-2' },
      ),
    ).toBe(false);
  });
});
