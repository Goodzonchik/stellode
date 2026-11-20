import { VersionStatus } from '@stellode/models';
import { isEmptyFeatureDraftPublishBlocked } from './is-empty-feature-draft-publish-blocked';

describe('isEmptyFeatureDraftPublishBlocked', () => {
  it('blocks draft without component versions', () => {
    expect(isEmptyFeatureDraftPublishBlocked(VersionStatus.Draft, undefined)).toBe(true);
    expect(isEmptyFeatureDraftPublishBlocked(VersionStatus.Draft, [])).toBe(true);
  });

  it('allows draft with at least one component version', () => {
    expect(isEmptyFeatureDraftPublishBlocked(VersionStatus.Draft, [{ id: 'cv1' }])).toBe(false);
  });

  it('does not block non-draft statuses', () => {
    expect(isEmptyFeatureDraftPublishBlocked(VersionStatus.Active, [])).toBe(false);
  });
});
