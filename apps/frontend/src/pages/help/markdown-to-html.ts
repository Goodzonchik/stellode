import { Marked, Renderer } from 'marked';
import type { Tokens } from 'marked';
import { slugifyHeading } from './slugify-heading';

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '');

const defaultRenderer = new Renderer();
const helpMarked = new Marked();

helpMarked.use({
  renderer: {
    heading(this: { parser: { parseInline: (tokens: Tokens.Heading['tokens']) => string } }, token) {
      const text = this.parser.parseInline(token.tokens);
      const id = slugifyHeading(stripTags(text));
      return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
    },
    table(this: Renderer, token: Tokens.Table) {
      return `<div class="help-article__table-wrap">${defaultRenderer.table.call(this, token)}</div>\n`;
    },
  },
});

export const markdownToHtml = (markdown: string): string =>
  String(helpMarked.parse(markdown, { async: false }));
