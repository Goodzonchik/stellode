import { Marked, Renderer } from 'marked';
import type { Tokens } from 'marked';
import type { HelpCalloutType } from './help-callout-type';
import { helpCalloutLabel } from './help-callout-label';
import { parseHelpCalloutMarker } from './parse-help-callout-marker';
import { slugifyHeading } from './slugify-heading';
import { stripHelpCalloutMarkerTokens } from './strip-help-callout-marker-tokens';

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '');

const defaultRenderer = new Renderer();
const helpMarked = new Marked();

type BlockquoteRendererContext = {
  parser: { parse: (tokens: Tokens.Generic[]) => string };
};

const renderPlainCallout = (bodyHtml: string): string =>
  `<blockquote class="help-article__callout help-article__callout--plain">\n${bodyHtml}</blockquote>\n`;

const renderTypedCallout = (
  type: HelpCalloutType,
  title: string,
  bodyHtml: string,
): string =>
  `<aside class="help-article__callout help-article__callout--${type}">` +
  `<p class="help-article__callout-title">${title}</p>\n${bodyHtml}</aside>\n`;

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
    blockquote(this: BlockquoteRendererContext, token: Tokens.Blockquote) {
      const calloutType = parseHelpCalloutMarker(token.text);
      if (calloutType === null) {
        return renderPlainCallout(this.parser.parse(token.tokens));
      }
      const bodyTokens = stripHelpCalloutMarkerTokens(token.tokens);
      return renderTypedCallout(
        calloutType,
        helpCalloutLabel(calloutType),
        this.parser.parse(bodyTokens),
      );
    },
  },
});

export const markdownToHtml = (markdown: string): string =>
  String(helpMarked.parse(markdown, { async: false }));
