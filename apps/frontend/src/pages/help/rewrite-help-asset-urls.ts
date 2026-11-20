import { helpSlugFromFile } from './help-slug-from-file';

const helpDirectoryOf = (markdownFile: string): string => {
  const slashIndex = markdownFile.lastIndexOf('/');
  return slashIndex < 0 ? '' : markdownFile.slice(0, slashIndex + 1);
};

const isAbsoluteOrSpecialUrl = (url: string): boolean =>
  /^(?:[a-z]+:|\/|#)/i.test(url);

const normalizePathSegments = (path: string): string => {
  const segments = path.split('/');
  const normalized: string[] = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      normalized.pop();
      continue;
    }
    normalized.push(segment);
  }
  return normalized.join('/');
};

const resolveHelpUrl = (url: string, markdownFile: string): string => {
  const basePath = `/help/${helpDirectoryOf(markdownFile)}`;
  const joined = `${basePath}${url}`;
  const withoutLeadingSlash = joined.replace(/^\/+/, '');
  const normalized = normalizePathSegments(withoutLeadingSlash);
  if (normalized.toLowerCase().endsWith('.md')) {
    return `/help/${helpSlugFromFile(normalized)}`;
  }
  return `/${normalized}`;
};

const rewriteAttributeUrls = (
  html: string,
  attribute: 'src' | 'href',
  markdownFile: string,
): string => {
  const pattern = new RegExp(`(<[^>]*\\b${attribute}=")([^"]+)(")`, 'gi');
  return html.replace(pattern, (match, prefix: string, url: string, suffix: string) => {
    if (isAbsoluteOrSpecialUrl(url)) {
      return match;
    }
    return `${prefix}${resolveHelpUrl(url, markdownFile)}${suffix}`;
  });
};

export const rewriteHelpAssetUrls = (html: string, markdownFile: string): string => {
  const withImages = rewriteAttributeUrls(html, 'src', markdownFile);
  return rewriteAttributeUrls(withImages, 'href', markdownFile);
};
