import type { HelpPage } from './help-manifest.types';

export const findHelpPageBySlug = (
  pages: readonly HelpPage[],
  slug: string,
): HelpPage | undefined => pages.find((page) => page.slug === slug);
