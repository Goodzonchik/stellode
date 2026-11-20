import {
  FeatureBindingReadinessReason,
  FeatureVersionReadinessReason,
  VersionStatus,
  type CheckFeatureVersionReadyResult,
  type FeatureBindingReadiness,
} from '@stellode/models';
import { shouldOpenFeatureReadinessModal } from './should-open-feature-readiness-modal';

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

const mkResult = (
  overrides: Partial<CheckFeatureVersionReadyResult> = {},
): CheckFeatureVersionReadyResult => ({
  featureVersion: {
    id: 'fv1',
    status: VersionStatus.Draft,
    readyToProduction: false,
  },
  readyToProduction: false,
  reason: null,
  bindings: [],
  crossUnitBindings: [],
  ...overrides,
});

describe('shouldOpenFeatureReadinessModal', () => {
  it('returns false when version was auto-published', () => {
    expect(
      shouldOpenFeatureReadinessModal(
        mkResult({
          featureVersion: {
            id: 'fv1',
            status: VersionStatus.Active,
            readyToProduction: false,
          },
          readyToProduction: true,
          bindings: [mkBinding()],
        }),
      ),
    ).toBe(false);
  });

  it('returns false when draft is ready to production', () => {
    expect(
      shouldOpenFeatureReadinessModal(
        mkResult({
          readyToProduction: true,
          bindings: [mkBinding()],
        }),
      ),
    ).toBe(false);
  });

  it('returns true when bindings are not ready', () => {
    expect(
      shouldOpenFeatureReadinessModal(
        mkResult({
          bindings: [
            mkBinding({
              ready: false,
              reason: FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
              statusInRelease: null,
            }),
          ],
        }),
      ),
    ).toBe(true);
  });

  it('returns false when there are no component bindings', () => {
    expect(
      shouldOpenFeatureReadinessModal(
        mkResult({
          reason: FeatureVersionReadinessReason.NoComponentBindings,
          bindings: [],
        }),
      ),
    ).toBe(false);
  });

  it('returns true when cross-unit bindings are not ready', () => {
    expect(
      shouldOpenFeatureReadinessModal(
        mkResult({
          bindings: [mkBinding({ ready: true })],
          crossUnitBindings: [
            mkBinding({
              applicationId: 'app-remote',
              ready: false,
              reason: FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
              statusInRelease: null,
            }),
          ],
        }),
      ),
    ).toBe(true);
  });
});
