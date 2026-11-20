import { isDependsOnEndpointType } from './is-depends-on-endpoint-type';

describe('isDependsOnEndpointType', () => {
  it('accepts componentVersion and projected component-like types', () => {
    expect(isDependsOnEndpointType('componentVersion')).toBe(true);
    expect(isDependsOnEndpointType('component')).toBe(true);
    expect(isDependsOnEndpointType('dependency')).toBe(true);
  });

  it('rejects other types', () => {
    expect(isDependsOnEndpointType('app')).toBe(false);
    expect(isDependsOnEndpointType(undefined)).toBe(false);
  });
});
