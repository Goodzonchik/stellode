import { resolveEdgeDependsOnApps } from './resolve-edge-depends-on-apps';

describe('resolveEdgeDependsOnApps', () => {
  it('prefers edge context apps', () => {
    expect(
      resolveEdgeDependsOnApps(
        { consumerApplicationId: 'edge-c', providerApplicationId: 'edge-p' },
        { data: { label: 's', applicationId: 'node-c' } },
        { data: { label: 't', applicationId: 'node-p' } },
      ),
    ).toEqual({
      consumerApplicationId: 'edge-c',
      providerApplicationId: 'edge-p',
    });
  });

  it('falls back to node applicationId', () => {
    expect(
      resolveEdgeDependsOnApps(
        {},
        { data: { label: 's', applicationId: 'node-c' } },
        { data: { label: 't', applicationId: 'node-p' } },
      ),
    ).toEqual({
      consumerApplicationId: 'node-c',
      providerApplicationId: 'node-p',
    });
  });
});
