import { VersionStatus } from '@stellode/models';
import { featureVersionNeedsCriticalConfirm } from './version-transition-guard';

describe('featureVersionNeedsCriticalConfirm', () => {
  it('does not require confirm for draft to active', () => {
    expect(featureVersionNeedsCriticalConfirm(VersionStatus.Draft, VersionStatus.Active)).toBe(false);
  });

  it('requires confirm for active to draft', () => {
    expect(featureVersionNeedsCriticalConfirm(VersionStatus.Active, VersionStatus.Draft)).toBe(true);
  });

  it('requires confirm for active to unactive', () => {
    expect(featureVersionNeedsCriticalConfirm(VersionStatus.Active, VersionStatus.Unactive)).toBe(true);
  });

  it('requires confirm for unactive to active', () => {
    expect(featureVersionNeedsCriticalConfirm(VersionStatus.Unactive, VersionStatus.Active)).toBe(true);
  });
});
