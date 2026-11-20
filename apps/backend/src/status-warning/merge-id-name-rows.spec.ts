import { mergeIdNameRows } from './merge-id-name-rows';

describe('mergeIdNameRows', () => {
  it('dedupes by id and sorts by name', () => {
    expect(
      mergeIdNameRows([
        { id: '2', name: 'Beta' },
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta-dup' },
        { id: '', name: 'Skip' },
      ]),
    ).toEqual([
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
    ]);
  });
});
