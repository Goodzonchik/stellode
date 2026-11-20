import { ApplicationVersionStatus } from '@stellode/models';
import { formatApplicationListVersion } from './format-application-list-version';

describe('formatApplicationListVersion', () => {
  it('returns empty when version is null', () => {
    expect(formatApplicationListVersion(null, null)).toEqual({ kind: 'empty' });
  });

  it('returns current cell for current status', () => {
    expect(formatApplicationListVersion('2', ApplicationVersionStatus.Current)).toEqual({
      kind: 'current',
      version: '2',
    });
  });

  it('returns inactive fallback for previous status', () => {
    expect(formatApplicationListVersion('3', ApplicationVersionStatus.Previous)).toEqual({
      kind: 'inactiveFallback',
      version: '3',
    });
  });

  it('treats version with null status as current text', () => {
    expect(formatApplicationListVersion('1', null)).toEqual({
      kind: 'current',
      version: '1',
    });
  });
});
