import { isComponentLikeType } from './is-component-like-type';

describe('isComponentLikeType', () => {
  it('accepts component and dependency', () => {
    expect(isComponentLikeType('component')).toBe(true);
    expect(isComponentLikeType('dependency')).toBe(true);
  });

  it('rejects other types and empty', () => {
    expect(isComponentLikeType('componentVersion')).toBe(false);
    expect(isComponentLikeType('app')).toBe(false);
    expect(isComponentLikeType(undefined)).toBe(false);
  });
});
