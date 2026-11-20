import {
  featureReadinessApplicationPath,
  featureReadinessComponentPath,
} from './feature-readiness-row-links';

describe('feature-readiness-row-links', () => {
  it('builds application list path with highlight and ctx.unitId', () => {
    expect(featureReadinessApplicationPath('app-1', 'unit-1')).toBe(
      '/applications?highlight=app-1&ctx.unitId=unit-1',
    );
  });

  it('builds component list path with highlight and ctx.unitId', () => {
    expect(featureReadinessComponentPath('cmp-1', 'unit-1')).toBe(
      '/components?highlight=cmp-1&ctx.unitId=unit-1',
    );
  });

  it('encodes ids in paths', () => {
    expect(featureReadinessApplicationPath('a/b', 'u 1')).toBe(
      '/applications?highlight=a%2Fb&ctx.unitId=u+1',
    );
    expect(featureReadinessComponentPath('c d', 'u1')).toBe(
      '/components?highlight=c+d&ctx.unitId=u1',
    );
  });
});
