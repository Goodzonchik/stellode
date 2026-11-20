import type { HelpManifestItem, HelpPage } from './help-manifest.types';
import { normalizeHelpManifest } from './normalize-help-manifest';

const isManifestItem = (value: unknown): value is HelpManifestItem => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { title?: unknown; file?: unknown };
  return typeof record.title === 'string' && typeof record.file === 'string';
};

export const loadHelpManifest = async (): Promise<readonly HelpPage[]> => {
  const response = await fetch('/help/manifest.json');
  if (!response.ok) {
    throw new Error(`Не удалось загрузить оглавление (${response.status})`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isManifestItem)) {
    throw new Error('Некорректный формат манифеста справки');
  }
  return normalizeHelpManifest(data);
};
