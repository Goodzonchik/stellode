import { panHelpFullViewTransform } from './pan-help-full-view-transform';

describe('panHelpFullViewTransform', () => {
  it('shifts x and y by delta', () => {
    expect(panHelpFullViewTransform({ scale: 1.5, x: 10, y: 20 }, 5, -3)).toEqual({
      scale: 1.5,
      x: 15,
      y: 17,
    });
  });
});
