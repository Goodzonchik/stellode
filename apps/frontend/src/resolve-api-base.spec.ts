import { resolveApiBase } from './resolve-api-base';

describe('resolveApiBase', () => {
  it('returns fallback when env is undefined', () => {
    expect(resolveApiBase(undefined)).toBe('http://localhost:3000/api');
  });

  it('returns fallback when env is empty', () => {
    expect(resolveApiBase('')).toBe('http://localhost:3000/api');
  });

  it('returns env value when set', () => {
    expect(resolveApiBase('https://api.example.com/api')).toBe('https://api.example.com/api');
  });
});
