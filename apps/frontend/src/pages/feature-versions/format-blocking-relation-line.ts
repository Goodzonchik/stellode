import type { FeatureVersionBlockingRelation } from './feature-version-blocking-relation';

const directionLabel = (direction: FeatureVersionBlockingRelation['direction']): string =>
  direction === 'incoming' ? 'входящая' : 'исходящая';

export const formatBlockingRelationLine = (row: FeatureVersionBlockingRelation): string => {
  const target = row.targetName || row.targetId || '—';
  return `${row.relationType} (${directionLabel(row.direction)}) → ${row.targetKind}: ${target}`;
};
