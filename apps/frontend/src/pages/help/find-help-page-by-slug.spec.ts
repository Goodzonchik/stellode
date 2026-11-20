import { findHelpPageBySlug } from './find-help-page-by-slug';
import type { HelpPage } from './help-manifest.types';

const pages: readonly HelpPage[] = [
  { title: 'О продукте', file: 'about.md', slug: 'about' },
  { title: 'Глоссарий', file: 'glossary.md', slug: 'glossary' },
];

describe('findHelpPageBySlug', () => {
  it('returns matching page', () => {
    expect(findHelpPageBySlug(pages, 'glossary')?.file).toBe('glossary.md');
  });

  it('returns undefined when missing', () => {
    expect(findHelpPageBySlug(pages, 'missing')).toBeUndefined();
  });
});
