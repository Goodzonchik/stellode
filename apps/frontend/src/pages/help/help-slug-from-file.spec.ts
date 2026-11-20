import { helpSlugFromFile } from './help-slug-from-file';

describe('helpSlugFromFile', () => {
  it('strips md extension from basename', () => {
    expect(helpSlugFromFile('about.md')).toBe('about');
  });

  it('uses basename for nested paths', () => {
    expect(helpSlugFromFile('guides/intro.md')).toBe('intro');
  });
});
