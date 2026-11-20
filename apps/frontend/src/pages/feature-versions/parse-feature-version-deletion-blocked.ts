import axios from 'axios';
import type { FeatureVersionBlockingRelation } from './feature-version-blocking-relation';

const isDirection = (value: unknown): value is 'incoming' | 'outgoing' =>
  value === 'incoming' || value === 'outgoing';

const toBlockingRelation = (value: unknown): FeatureVersionBlockingRelation | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.relationType !== 'string' || !isDirection(row.direction)) return null;
  return {
    relationType: row.relationType,
    direction: row.direction,
    targetId: typeof row.targetId === 'string' ? row.targetId : '',
    targetKind: typeof row.targetKind === 'string' ? row.targetKind : 'Unknown',
    targetName: typeof row.targetName === 'string' ? row.targetName : '',
  };
};

export const parseFeatureVersionDeletionBlocked = (
  error: unknown,
): readonly FeatureVersionBlockingRelation[] | null => {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data;
  if (!data || typeof data !== 'object') return null;
  const rows = (data as { blockingRelations?: unknown }).blockingRelations;
  if (!Array.isArray(rows)) return null;
  const parsed = rows
    .map(toBlockingRelation)
    .filter((row): row is FeatureVersionBlockingRelation => row !== null);
  return parsed.length > 0 ? parsed : null;
};
