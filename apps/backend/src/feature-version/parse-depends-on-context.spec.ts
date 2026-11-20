import { parseDependsOnContext } from './parse-depends-on-context';

describe('parseDependsOnContext', () => {
  it('parses JSON context string', () => {
    const result = parseDependsOnContext(
      JSON.stringify({
        consumerApplicationId: 'app-1',
        consumerFeatureVersionId: 'fv-1',
        providerApplicationId: 'app-2',
      }),
    );
    expect(result.consumerApplicationId).toBe('app-1');
    expect(result.consumerFeatureVersionId).toBe('fv-1');
    expect(result.providerApplicationId).toBe('app-2');
  });

  it('returns empty object for invalid input', () => {
    expect(parseDependsOnContext(null)).toEqual({});
    expect(parseDependsOnContext('{')).toEqual({});
    expect(parseDependsOnContext('[]')).toEqual({});
  });

  it('accepts already parsed object', () => {
    expect(
      parseDependsOnContext({ consumerApplicationId: 'app-1', consumerFeatureVersionId: 'fv-1' }),
    ).toEqual(
      expect.objectContaining({
        consumerApplicationId: 'app-1',
        consumerFeatureVersionId: 'fv-1',
      }),
    );
  });
});
