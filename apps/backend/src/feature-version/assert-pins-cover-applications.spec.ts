import { assertPinsCoverApplications } from './assert-pins-cover-applications';

describe('assertPinsCoverApplications', () => {
  it('returns pins for every required application', () => {
    expect(
      assertPinsCoverApplications(
        ['app-a', 'app-b'],
        [
          { applicationId: 'app-a', applicationVersionId: 'av-a' },
          { applicationId: 'app-b', applicationVersionId: 'av-b' },
          { applicationId: 'app-extra', applicationVersionId: 'av-x' },
        ],
      ),
    ).toEqual([
      { applicationId: 'app-a', applicationVersionId: 'av-a' },
      { applicationId: 'app-b', applicationVersionId: 'av-b' },
    ]);
  });

  it('throws when a required application has no pin', () => {
    expect(() =>
      assertPinsCoverApplications(
        ['app-a', 'app-b'],
        [{ applicationId: 'app-a', applicationVersionId: 'av-a' }],
      ),
    ).toThrow(/missing current release for applications: app-b/);
  });
});
