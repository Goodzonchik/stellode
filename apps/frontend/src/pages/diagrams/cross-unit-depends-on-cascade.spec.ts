import {
  collectProviderApplicationsFromUses,
  collectPublicCvOptionsForApplication,
  pickSoleOptionValue,
  resolveCascadeSelection,
} from './cross-unit-depends-on-cascade';

describe('cross-unit-depends-on-cascade', () => {
  describe('pickSoleOptionValue', () => {
    it('returns null for empty or multiple options', () => {
      expect(pickSoleOptionValue([])).toBeNull();
      expect(
        pickSoleOptionValue([
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]),
      ).toBeNull();
    });

    it('returns the only value', () => {
      expect(pickSoleOptionValue([{ value: 'only', label: 'Only' }])).toBe('only');
    });
  });

  describe('collectProviderApplicationsFromUses', () => {
    it('returns distinct applications with names', () => {
      expect(
        collectProviderApplicationsFromUses([
          {
            id: 'cv1',
            applicationId: 'app-1',
            applicationName: 'Web',
            isPublic: true,
            status: 'active',
          },
          {
            id: 'cv2',
            applicationId: 'app-1',
            applicationName: 'Web',
            isPublic: true,
            status: 'active',
          },
          {
            id: 'cv3',
            applicationId: 'app-2',
            applicationName: 'Mobile',
            isPublic: false,
            status: 'draft',
          },
        ]),
      ).toEqual([
        { value: 'app-1', label: 'Web' },
        { value: 'app-2', label: 'Mobile' },
      ]);
    });

    it('skips rows without applicationId and falls back label to id', () => {
      expect(
        collectProviderApplicationsFromUses([
          { id: 'cv1', isPublic: true, status: 'active' },
          { id: 'cv2', applicationId: '  ', applicationName: 'X' },
          { id: 'cv3', applicationId: 'app-x' },
        ]),
      ).toEqual([{ value: 'app-x', label: 'app-x' }]);
    });
  });

  describe('collectPublicCvOptionsForApplication', () => {
    const rows = [
      {
        id: 'cv-a',
        version: '1',
        status: 'active',
        isPublic: true,
        applicationId: 'app-1',
      },
      {
        id: 'cv-b',
        version: '2',
        status: 'draft',
        isPublic: true,
        applicationId: 'app-2',
      },
      {
        id: 'cv-c',
        version: '3',
        status: 'active',
        isPublic: false,
        applicationId: 'app-1',
      },
      {
        id: 'cv-d',
        version: '4',
        status: 'unactive',
        isPublic: true,
        applicationId: 'app-1',
      },
    ] as const;

    it('returns empty when application is not selected', () => {
      expect(collectPublicCvOptionsForApplication(rows, null)).toEqual([]);
      expect(collectPublicCvOptionsForApplication(rows, '')).toEqual([]);
    });

    it('filters by application, isPublic and allowed statuses', () => {
      expect(collectPublicCvOptionsForApplication(rows, 'app-1')).toEqual([
        { value: 'cv-a', label: 'v1 (active)' },
      ]);
    });
  });

  describe('resolveCascadeSelection', () => {
    it('auto-selects sole option', () => {
      expect(resolveCascadeSelection([{ value: 'u1', label: 'U' }], null)).toBe('u1');
    });

    it('keeps current when still valid among many', () => {
      expect(
        resolveCascadeSelection(
          [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
          'b',
        ),
      ).toBe('b');
    });

    it('clears current when no longer in options', () => {
      expect(
        resolveCascadeSelection(
          [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
          'gone',
        ),
      ).toBeNull();
    });
  });
});
