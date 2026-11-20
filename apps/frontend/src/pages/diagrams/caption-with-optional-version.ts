import type { ViewNode } from '@stellode/models';

type VersionFields = Pick<
  ViewNode['data'],
  'label' | 'actualVersion' | 'actualVersionNumber' | 'draftVersion' | 'draftVersionNumber'
>;

const versionText = (value?: string, versionNumber?: number): string | null =>
  value ?? (versionNumber !== undefined ? String(versionNumber) : null);

const pickVersionText = (data: VersionFields): string | null => {
  if (data.actualVersion !== undefined || data.actualVersionNumber !== undefined) {
    return versionText(data.actualVersion, data.actualVersionNumber);
  }
  return versionText(data.draftVersion, data.draftVersionNumber);
};

export const captionWithOptionalVersion = (data: VersionFields): string => {
  const name = data.label.trim();
  const version = pickVersionText(data);
  if (version === null) return data.label;
  return name.length === 0 ? version : `${name} · ${version}`;
};
