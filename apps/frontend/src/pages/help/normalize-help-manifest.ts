import type { HelpManifestItem, HelpPage } from './help-manifest.types';
import { helpSlugFromFile } from './help-slug-from-file';

export const normalizeHelpManifest = (
  items: readonly HelpManifestItem[],
): readonly HelpPage[] =>
  items.map((item) => ({
    title: item.title,
    file: item.file,
    slug: helpSlugFromFile(item.file),
  }));
