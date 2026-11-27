import { mergeCypherSetParts, optionalDescriptionSet } from './set-parts';

describe('optionalDescriptionSet', () => {
  it('returns null when description is omitted', () => {
    expect(optionalDescriptionSet(undefined)).toBeNull();
  });

  it('sets description to null when clearing with empty string', () => {
    expect(optionalDescriptionSet('')).toEqual({
      assignment: 'n.description = $description',
      params: { description: null },
    });
  });

  it('sets description to null when clearing with null', () => {
    expect(optionalDescriptionSet(null)).toEqual({
      assignment: 'n.description = $description',
      params: { description: null },
    });
  });

  it('sets non-empty description', () => {
    expect(optionalDescriptionSet('hello')).toEqual({
      assignment: 'n.description = $description',
      params: { description: 'hello' },
    });
  });
});

describe('mergeCypherSetParts with cleared description', () => {
  it('builds SET clause that writes null description', () => {
    const part = optionalDescriptionSet('');
    expect(part).not.toBeNull();
    const merged = mergeCypherSetParts([part!], 'team');
    expect(merged.setClause).toBe('SET team.description = $p0_description');
    expect(merged.params).toEqual({ p0_description: null });
  });
});
