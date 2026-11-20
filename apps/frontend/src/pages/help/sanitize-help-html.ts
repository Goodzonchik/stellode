import DOMPurify from 'dompurify';

export const sanitizeHelpHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['id', 'target', 'rel'],
  });
