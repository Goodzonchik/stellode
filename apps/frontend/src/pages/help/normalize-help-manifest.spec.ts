import { normalizeHelpManifest } from './normalize-help-manifest';

describe('normalizeHelpManifest', () => {
  it('adds slug from file basename', () => {
    expect(
      normalizeHelpManifest([
        { title: 'О продукте', file: 'about.md' },
        { title: 'Глоссарий', file: 'glossary.md' },
      ]),
    ).toEqual([
      { title: 'О продукте', file: 'about.md', slug: 'about' },
      { title: 'Глоссарий', file: 'glossary.md', slug: 'glossary' },
    ]);
  });
});
