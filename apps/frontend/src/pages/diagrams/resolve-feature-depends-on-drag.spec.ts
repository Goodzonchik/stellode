import { resolveDependsOnConnection } from './resolve-depends-on-connection';

describe('feature depends-on drag endpoints', () => {
  it('resolves consumer and provider for two component nodes', () => {
    const dep = resolveDependsOnConnection('cv-a', 'cv-b', [
      { id: 'cv-a', data: { type: 'component' } },
      { id: 'cv-b', data: { type: 'dependency' } },
    ]);
    expect(dep).toEqual({
      consumerComponentVersionId: 'cv-a',
      providerComponentVersionId: 'cv-b',
    });
  });
});
