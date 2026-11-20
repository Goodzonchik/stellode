import { markdownToHtml } from './markdown-to-html';
import { rewriteHelpAssetUrls } from './rewrite-help-asset-urls';
import { sanitizeHelpHtml } from './sanitize-help-html';

export const parseHelpMarkdownHtml = (markdown: string, markdownFile: string): string => {
  const unsafeHtml = markdownToHtml(markdown);
  const withAssets = rewriteHelpAssetUrls(unsafeHtml, markdownFile);
  return sanitizeHelpHtml(withAssets);
};
