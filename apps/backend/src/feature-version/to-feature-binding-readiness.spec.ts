import { FeatureBindingReadinessReason } from '@stellode/models';
import { toFeatureBindingReadiness } from './to-feature-binding-readiness';

describe('toFeatureBindingReadiness', () => {
  it('maps a ready binding with active status in release', () => {
    expect(
      toFeatureBindingReadiness({
        applicationId: 'app-1',
        applicationName: 'App One',
        componentId: 'cmp-1',
        componentName: 'Cmp One',
        componentVersionId: 'cv-1',
        componentVersion: '1.2.0',
        unitId: 'unit-1',
        hasCurrentRelease: true,
        statusInRelease: 'active',
      }),
    ).toEqual({
      applicationId: 'app-1',
      applicationName: 'App One',
      componentId: 'cmp-1',
      componentName: 'Cmp One',
      componentVersionId: 'cv-1',
      componentVersion: '1.2.0',
      unitId: 'unit-1',
      statusInRelease: 'active',
      ready: true,
      reason: FeatureBindingReadinessReason.Ready,
    });
  });

  it('maps missing release as not ready', () => {
    const result = toFeatureBindingReadiness({
      applicationId: 'app-1',
      applicationName: 'App One',
      componentId: 'cmp-1',
      componentName: 'Cmp One',
      componentVersionId: 'cv-1',
      componentVersion: '1.0.0',
      unitId: 'unit-1',
      hasCurrentRelease: false,
      statusInRelease: null,
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toBe(FeatureBindingReadinessReason.ApplicationHasNoCurrentRelease);
    expect(result.statusInRelease).toBeNull();
  });
});
