import { collectPinApplicationIds } from './collect-pin-application-ids';

describe('collectPinApplicationIds', () => {
  it('returns distinct sorted application ids from uses and providers', () => {
    expect(
      collectPinApplicationIds(
        [
          { applicationId: 'app-b' },
          { applicationId: 'app-a' },
          { applicationId: 'app-a' },
        ],
        [{ applicationId: 'app-c' }, { applicationId: 'app-b' }],
      ),
    ).toEqual(['app-a', 'app-b', 'app-c']);
  });

  it('skips empty application ids', () => {
    expect(
      collectPinApplicationIds([{ applicationId: '  ' }, { applicationId: 'app-1' }], [
        { applicationId: '' },
      ]),
    ).toEqual(['app-1']);
  });
});
