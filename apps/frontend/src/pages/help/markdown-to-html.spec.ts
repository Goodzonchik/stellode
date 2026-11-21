import { markdownToHtml } from './markdown-to-html';

describe('markdownToHtml', () => {
  it('adds id attributes to headings', () => {
    const html = markdownToHtml('## Глоссарий');
    expect(html).toContain('<h2 id="глоссарий">Глоссарий</h2>');
  });

  it('does not treat mermaid fences as special', () => {
    const html = markdownToHtml('```mermaid\nflowchart LR\n```');
    expect(html).toContain('<code');
  });

  it('wraps tables for help article styles', () => {
    const html = markdownToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<div class="help-article__table-wrap"><table>');
    expect(html).toContain('</table>\n</div>');
  });

  it('renders plain blockquote as untyped callout', () => {
    const html = markdownToHtml('> Только одна draft');
    expect(html).toContain(
      '<blockquote class="help-article__callout help-article__callout--plain">',
    );
    expect(html).toContain('<p>Только одна draft</p>');
    expect(html).not.toContain('help-article__callout-title');
  });

  it('renders typed GitHub-style callout with Russian title', () => {
    const html = markdownToHtml(
      '> [!WARNING]\n> У компонента одновременно допустима только одна `draft`.',
    );
    expect(html).toContain(
      '<aside class="help-article__callout help-article__callout--warning">',
    );
    expect(html).toContain('<p class="help-article__callout-title">Внимание</p>');
    expect(html).toContain('<code>draft</code>');
    expect(html).not.toContain('[!WARNING]');
  });

  it('keeps body paragraphs after a marker-only first line', () => {
    const html = markdownToHtml('> [!NOTE]\n>\n> Второй абзац');
    expect(html).toContain('help-article__callout--note');
    expect(html).toContain('<p class="help-article__callout-title">Заметка</p>');
    expect(html).toContain('<p>Второй абзац</p>');
    expect(html).not.toContain('[!NOTE]');
  });
});
