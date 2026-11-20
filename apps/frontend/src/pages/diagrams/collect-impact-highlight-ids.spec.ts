import { collectImpactHighlightIds } from './collect-impact-highlight-ids';

const toSorted = (s: Set<string>) => [...s].sort();

describe('collectImpactHighlightIds', () => {
  it('returns empty set for null', () => {
    expect(collectImpactHighlightIds(null).size).toBe(0);
  });

  it('returns empty set for non-object', () => {
    expect(collectImpactHighlightIds('x').size).toBe(0);
    expect(collectImpactHighlightIds(1).size).toBe(0);
  });

  it('returns empty set for empty object', () => {
    expect(collectImpactHighlightIds({}).size).toBe(0);
  });

  it('collects ids from partial fields only', () => {
    const input = {
      units: [{ id: 't1', name: 'T' }],
      teams: [{ id: 'tm1', name: 'Team' }],
    };
    expect(toSorted(collectImpactHighlightIds(input))).toEqual(['t1', 'tm1']);
  });

  it('ignores non-array bucket values', () => {
    const input = {
      units: { id: 'bad', name: 'x' },
      services: [{ id: 's1', name: 'S' }],
    };
    expect(toSorted(collectImpactHighlightIds(input))).toEqual(['s1']);
  });

  it('skips array elements without string id', () => {
    const input = {
      features: [{ id: 'f1', name: 'F' }, {}, { id: 2, name: 'N' }, { name: 'no id' }],
    };
    expect(toSorted(collectImpactHighlightIds(input))).toEqual(['f1']);
  });

  it('deduplicates ids across buckets', () => {
    const input = {
      units: [{ id: 'same', name: 'A' }],
      teams: [{ id: 'same', name: 'B' }],
    };
    expect(collectImpactHighlightIds(input).size).toBe(1);
    expect(collectImpactHighlightIds(input).has('same')).toBe(true);
  });
});
