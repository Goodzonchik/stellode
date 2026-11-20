import {
  FeatureBindingReadinessReason,
  VersionStatus,
  type FeatureBindingReadiness,
} from '@stellode/models';
import { sortFeatureBindingReadiness } from './sort-feature-binding-readiness';

const mkBinding = (overrides: Partial<FeatureBindingReadiness> = {}): FeatureBindingReadiness => ({
  applicationId: 'app-1',
  applicationName: 'App A',
  componentId: 'cmp-1',
  componentName: 'Cmp A',
  componentVersionId: 'cv-1',
  componentVersion: '1.0.0',
  unitId: 'unit-1',
  statusInRelease: VersionStatus.Active,
  ready: true,
  reason: FeatureBindingReadinessReason.Ready,
  ...overrides,
});

describe('sortFeatureBindingReadiness', () => {
  it('puts not-ready bindings first', () => {
    const sorted = sortFeatureBindingReadiness([
      mkBinding({ applicationName: 'Zebra', ready: true }),
      mkBinding({
        applicationId: 'app-2',
        applicationName: 'Alpha',
        ready: false,
        reason: FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
        statusInRelease: null,
      }),
      mkBinding({
        applicationId: 'app-3',
        applicationName: 'Beta',
        ready: false,
        reason: FeatureBindingReadinessReason.ApplicationHasNoCurrentRelease,
        statusInRelease: null,
      }),
    ]);

    expect(sorted.map((row) => row.applicationName)).toEqual(['Alpha', 'Beta', 'Zebra']);
  });
});
