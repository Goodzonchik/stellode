import {
  FeatureBindingReadinessReason,
  VersionStatus,
  type FeatureBindingReadiness,
} from '@stellode/models';
import { filterNotReadyBindings } from './filter-not-ready-bindings';

const mkBinding = (overrides: Partial<FeatureBindingReadiness> = {}): FeatureBindingReadiness => ({
  applicationId: 'app-1',
  applicationName: 'App',
  componentId: 'cmp-1',
  componentName: 'Cmp',
  componentVersionId: 'cv-1',
  componentVersion: '1.0.0',
  unitId: 'unit-1',
  statusInRelease: VersionStatus.Active,
  ready: true,
  reason: FeatureBindingReadinessReason.Ready,
  ...overrides,
});

describe('filterNotReadyBindings', () => {
  it('returns only not-ready bindings from a mixed list', () => {
    const notReady = mkBinding({
      applicationId: 'app-2',
      ready: false,
      reason: FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
      statusInRelease: null,
    });
    expect(filterNotReadyBindings([mkBinding(), notReady])).toEqual([notReady]);
  });

  it('returns empty list when all bindings are ready', () => {
    expect(filterNotReadyBindings([mkBinding(), mkBinding({ applicationId: 'app-2' })])).toEqual(
      [],
    );
  });

  it('returns empty list for empty input', () => {
    expect(filterNotReadyBindings([])).toEqual([]);
  });
});
