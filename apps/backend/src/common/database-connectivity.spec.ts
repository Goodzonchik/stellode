import { isDatabaseConnectivityError } from './database-connectivity';

describe('isDatabaseConnectivityError', () => {
  it('returns true for ServiceUnavailable code', () => {
    const e = { code: 'ServiceUnavailable' };
    expect(isDatabaseConnectivityError(e)).toBe(true);
  });

  it('returns true for DatabaseUnavailable code', () => {
    const e = { code: 'DatabaseUnavailable' };
    expect(isDatabaseConnectivityError(e)).toBe(true);
  });

  it('returns true for SessionExpired code', () => {
    const e = { code: 'SessionExpired' };
    expect(isDatabaseConnectivityError(e)).toBe(true);
  });

  it('returns true for ECONNREFUSED code string', () => {
    const e = { code: 'ECONNREFUSED' };
    expect(isDatabaseConnectivityError(e)).toBe(true);
  });

  it('returns false for unrelated error code', () => {
    const e = { code: 'InvalidRequestException' };
    expect(isDatabaseConnectivityError(e)).toBe(false);
  });

  it('returns true for ECONNREFUSED errno', () => {
    const e = new Error('connect refused') as NodeJS.ErrnoException;
    e.code = 'ECONNREFUSED';
    expect(isDatabaseConnectivityError(e)).toBe(true);
  });

  it('returns false for generic Error', () => {
    expect(isDatabaseConnectivityError(new Error('oops'))).toBe(false);
  });
});
