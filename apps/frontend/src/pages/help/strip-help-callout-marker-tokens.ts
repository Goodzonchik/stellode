import type { Tokens } from 'marked';

const CALLOUT_ALONE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/i;
const CALLOUT_WITH_BODY =
  /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\r?\n/i;

const stripMarkerFromInlineTokens = (
  tokens: readonly Tokens.Generic[],
  markerLength: number,
): Tokens.Generic[] => {
  const first = tokens[0];
  if (first === undefined || first.type !== 'text') {
    return [...tokens];
  }
  const remaining = String(first.text ?? '').slice(markerLength);
  if (remaining === '') {
    return tokens.slice(1);
  }
  return [{ ...first, raw: remaining, text: remaining }, ...tokens.slice(1)];
};

const stripMarkerFromParagraph = (
  paragraph: Tokens.Paragraph,
  markerLength: number,
): Tokens.Paragraph => ({
  ...paragraph,
  raw: paragraph.raw.slice(markerLength),
  text: paragraph.text.slice(markerLength),
  tokens: stripMarkerFromInlineTokens(paragraph.tokens ?? [], markerLength),
});

const withoutLeadingSpace = (tokens: readonly Tokens.Generic[]): Tokens.Generic[] =>
  tokens[0]?.type === 'space' ? tokens.slice(1) : [...tokens];

export const stripHelpCalloutMarkerTokens = (
  tokens: readonly Tokens.Generic[],
): Tokens.Generic[] => {
  const first = tokens[0];
  if (first === undefined || first.type !== 'paragraph') {
    return [...tokens];
  }
  const paragraph = first as Tokens.Paragraph;
  if (CALLOUT_ALONE.test(paragraph.text)) {
    return withoutLeadingSpace(tokens.slice(1));
  }
  const withBody = CALLOUT_WITH_BODY.exec(paragraph.text);
  if (withBody === null) {
    return [...tokens];
  }
  return [stripMarkerFromParagraph(paragraph, withBody[0].length), ...tokens.slice(1)];
};
