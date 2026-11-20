import { ApplicationVersionStatus } from '@stellode/models';

export type CompositionVersionRef = {
  id: string;
  version: string;
  status: string;
};

export const resolveApplicationCompositionVersionId = (
  versions: readonly CompositionVersionRef[],
  versionParam: string,
): string | null => {
  if (versionParam === 'latest') return null;
  if (versionParam === 'current') {
    return (
      versions.find((row) => row.status === ApplicationVersionStatus.Current)?.id ?? null
    );
  }
  return versions.find((row) => row.version === versionParam)?.id ?? null;
};
