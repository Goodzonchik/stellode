import { shouldBindComponentToFeatureVersion } from './should-bind-component-to-feature-version';

describe('shouldBindComponentToFeatureVersion', () => {
  it('is true only for feature-version with anchor id', () => {
    expect(shouldBindComponentToFeatureVersion('feature-version', 'fv-1')).toBe(true);
    expect(shouldBindComponentToFeatureVersion('feature-version', undefined)).toBe(false);
    expect(shouldBindComponentToFeatureVersion('component', 'fv-1')).toBe(false);
  });
});
