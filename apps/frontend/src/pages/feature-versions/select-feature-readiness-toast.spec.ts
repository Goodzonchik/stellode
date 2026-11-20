import {
  FeatureBindingReadinessReason,
  FeatureVersionReadinessReason,
  VersionStatus,
  type CheckFeatureVersionReadyResult,
  type FeatureBindingReadiness,
} from '@stellode/models';
import { ToastVariant } from '../../hooks/useToast';
import { selectFeatureReadinessToast } from './select-feature-readiness-toast';

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

describe('selectFeatureReadinessToast', () => {
  it('returns success when version was auto-published', () => {
    expect(
      selectFeatureReadinessToast(
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
    ).toEqual({
      message: 'Версия автоматически опубликована',
      variant: ToastVariant.Success,
    });
  });

  it('returns success when draft is ready to publish', () => {
    expect(
      selectFeatureReadinessToast(
        mkResult({
          readyToProduction: true,
          bindings: [mkBinding()],
        }),
      ),
    ).toEqual({
      message: 'Версия фичи готова к публикации',
      variant: ToastVariant.Success,
    });
  });

  it('returns null when not-ready bindings are shown in modal', () => {
    expect(
      selectFeatureReadinessToast(
        mkResult({
          bindings: [
            mkBinding({ ready: true }),
            mkBinding({
              applicationId: 'app-2',
              ready: false,
              reason: FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
              statusInRelease: null,
            }),
          ],
        }),
      ),
    ).toBeNull();
  });

  it('returns null when not-ready cross-unit bindings are shown in modal', () => {
    expect(
      selectFeatureReadinessToast(
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
    ).toBeNull();
  });

  it('returns warning when there are no component bindings', () => {
    expect(
      selectFeatureReadinessToast(
        mkResult({
          reason: FeatureVersionReadinessReason.NoComponentBindings,
          bindings: [],
        }),
      ),
    ).toEqual({
      message: 'Нет связанных компонентов',
      variant: ToastVariant.Warning,
    });
  });
});
