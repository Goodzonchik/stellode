import { rewriteHelpAssetUrls } from './rewrite-help-asset-urls';

describe('rewriteHelpAssetUrls', () => {
  it('prefixes relative image urls with help directory', () => {
    const html = '<p><img src="images/example.svg" alt="x"></p>';
    expect(rewriteHelpAssetUrls(html, 'about.md')).toBe(
      '<p><img src="/help/images/example.svg" alt="x"></p>',
    );
  });

  it('keeps absolute urls unchanged', () => {
    const html = '<a href="/units">Units</a><img src="https://cdn.example/a.png">';
    expect(rewriteHelpAssetUrls(html, 'about.md')).toBe(html);
  });

  it('resolves relative to nested markdown file directory', () => {
    const html = '<img src="pic.png">';
    expect(rewriteHelpAssetUrls(html, 'guides/intro.md')).toBe(
      '<img src="/help/guides/pic.png">',
    );
  });

  it('resolves parent-relative image urls from guides', () => {
    const html = '<img src="../images/x.png" alt="x">';
    expect(rewriteHelpAssetUrls(html, 'guides/feature.md')).toBe(
      '<img src="/help/images/x.png" alt="x">',
    );
  });

  it('maps root markdown links to help slugs', () => {
    const html = '<a href="./scenarios.md">Сценарии</a>';
    expect(rewriteHelpAssetUrls(html, 'about.md')).toBe(
      '<a href="/help/scenarios">Сценарии</a>',
    );
  });

  it('maps nested guide markdown links to help slugs', () => {
    const html = '<a href="../guides/feature.md">Фича</a>';
    expect(rewriteHelpAssetUrls(html, 'guides/diagrams.md')).toBe(
      '<a href="/help/feature">Фича</a>',
    );
  });

  it('maps sibling guide markdown links to help slugs', () => {
    const html = '<a href="./feature.md">Фича</a>';
    expect(rewriteHelpAssetUrls(html, 'guides/diagrams.md')).toBe(
      '<a href="/help/feature">Фича</a>',
    );
  });
});
