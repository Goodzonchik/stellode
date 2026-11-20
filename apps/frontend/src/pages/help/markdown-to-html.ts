import { Marked } from 'marked';
import type { Tokens } from 'marked';
import { slugifyHeading } from './slugify-heading';

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '');

const helpMarked = new Marked();

helpMarked.use({
  renderer: {
    heading(this: { parser: { parseInline: (tokens: Tokens.Heading['tokens']) => string } }, token) {
      const text = this.parser.parseInline(token.tokens);
      const id = slugifyHeading(stripTags(text));
      return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
    },
  },
});

export const markdownToHtml = (markdown: string): string =>
  String(helpMarked.parse(markdown, { async: false }));
