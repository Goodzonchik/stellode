import { FeatureBindingReadinessReason } from '@stellode/models';
import { resolveBindingReadinessReason } from './resolve-binding-readiness-reason';

describe('resolveBindingReadinessReason', () => {
  it('returns application_has_no_current_release when current release is missing', () => {
    expect(
      resolveBindingReadinessReason({ hasCurrentRelease: false, statusInRelease: null }),
    ).toBe(FeatureBindingReadinessReason.ApplicationHasNoCurrentRelease);
  });

  it('returns component_not_in_current_release when HAS_COMPONENT is missing', () => {
    expect(
      resolveBindingReadinessReason({ hasCurrentRelease: true, statusInRelease: null }),
    ).toBe(FeatureBindingReadinessReason.ComponentNotInCurrentRelease);
  });

  it('returns component_not_active_in_release for unactive in release', () => {
    expect(
      resolveBindingReadinessReason({ hasCurrentRelease: true, statusInRelease: 'unactive' }),
    ).toBe(FeatureBindingReadinessReason.ComponentNotActiveInRelease);
  });

  it('returns component_not_active_in_release for draft in release', () => {
    expect(
      resolveBindingReadinessReason({ hasCurrentRelease: true, statusInRelease: 'draft' }),
    ).toBe(FeatureBindingReadinessReason.ComponentNotActiveInRelease);
  });

  it('returns ready for active in release', () => {
    expect(
      resolveBindingReadinessReason({ hasCurrentRelease: true, statusInRelease: 'active' }),
    ).toBe(FeatureBindingReadinessReason.Ready);
  });

  it('returns ready for deprecated in release', () => {
    expect(
      resolveBindingReadinessReason({ hasCurrentRelease: true, statusInRelease: 'deprecated' }),
    ).toBe(FeatureBindingReadinessReason.Ready);
  });
});
