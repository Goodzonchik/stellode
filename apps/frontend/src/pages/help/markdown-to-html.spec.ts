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
});
