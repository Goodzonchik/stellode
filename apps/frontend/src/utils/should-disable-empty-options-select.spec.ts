import { shouldDisableEmptyOptionsSelect } from './should-disable-empty-options-select';

describe('shouldDisableEmptyOptionsSelect', () => {
  it('disables when there are no options', () => {
    expect(shouldDisableEmptyOptionsSelect(0)).toBe(true);
  });

  it('disables when there is a single option', () => {
    expect(shouldDisableEmptyOptionsSelect(1)).toBe(true);
  });

  it('enables when there are multiple options', () => {
    expect(shouldDisableEmptyOptionsSelect(2)).toBe(false);
    expect(shouldDisableEmptyOptionsSelect(3)).toBe(false);
  });
});
