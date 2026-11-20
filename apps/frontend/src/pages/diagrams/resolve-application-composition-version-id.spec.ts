import { ApplicationVersionStatus } from '@stellode/models';
import { resolveApplicationCompositionVersionId } from './resolve-application-composition-version-id';

describe('resolveApplicationCompositionVersionId', () => {
  const versions = [
    { id: 'av-cur', version: '2', status: ApplicationVersionStatus.Current },
    { id: 'av-prev', version: '1', status: ApplicationVersionStatus.Previous },
  ];

  it('returns null for latest', () => {
    expect(resolveApplicationCompositionVersionId(versions, 'latest')).toBeNull();
  });

  it('resolves current by status', () => {
    expect(resolveApplicationCompositionVersionId(versions, 'current')).toBe('av-cur');
  });

  it('resolves previous by version string', () => {
    expect(resolveApplicationCompositionVersionId(versions, '1')).toBe('av-prev');
  });

  it('returns null when target is missing', () => {
    expect(resolveApplicationCompositionVersionId(versions, '9')).toBeNull();
    expect(resolveApplicationCompositionVersionId([], 'current')).toBeNull();
  });
});
