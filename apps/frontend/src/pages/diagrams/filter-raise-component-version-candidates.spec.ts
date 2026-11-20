import { filterRaiseComponentVersionCandidates } from './filter-raise-component-version-candidates';

describe('filterRaiseComponentVersionCandidates', () => {
  it('keeps only newer draft/active/deprecated versions', () => {
    const result = filterRaiseComponentVersionCandidates(
      [
        { id: 'a', version: '1', versionNumber: 1, status: 'active' },
        { id: 'b', version: '2', versionNumber: 2, status: 'draft' },
        { id: 'c', version: '3', versionNumber: 3, status: 'unactive' },
        { id: 'd', version: '4', versionNumber: 4, status: 'deprecated' },
      ],
      1,
    );
    expect(result.map((row) => row.id)).toEqual(['d', 'b']);
  });
});
