import { BadRequestException } from '@nestjs/common';

export const BlockingRelationDirection = {
  Incoming: 'incoming',
  Outgoing: 'outgoing',
} as const;

export type BlockingRelationDirection =
  (typeof BlockingRelationDirection)[keyof typeof BlockingRelationDirection];

interface BlockingRelation {
  readonly relationType: string;
  readonly direction: BlockingRelationDirection;
  readonly targetId: string;
  readonly targetKind: string;
  readonly targetName: string;
}

const toBlockingRelation = (value: unknown): BlockingRelation | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const relationType = row.relationType;
  const direction = row.direction;
  if (typeof relationType !== 'string') return null;
  if (
    direction !== BlockingRelationDirection.Incoming &&
    direction !== BlockingRelationDirection.Outgoing
  )
    return null;
  return {
    relationType,
    direction,
    targetId: typeof row.targetId === 'string' ? row.targetId : '',
    targetKind: typeof row.targetKind === 'string' ? row.targetKind : 'Unknown',
    targetName: typeof row.targetName === 'string' ? row.targetName : '',
  };
};

export const parseBlockingRelations = (rows: unknown): BlockingRelation[] =>
  (Array.isArray(rows) ? rows : [])
    .map(toBlockingRelation)
    .filter((row): row is BlockingRelation => row !== null);

export const blockingRelationsSummary = (
  rows: readonly BlockingRelation[],
): ReadonlyArray<{ relationType: string; direction: BlockingRelationDirection; count: number }> => {
  const counters = rows.reduce<Record<string, number>>((acc, row) => {
    const key = `${row.relationType}|${row.direction}`;
    return { ...acc, [key]: (acc[key] ?? 0) + 1 };
  }, {});
  return Object.entries(counters).map(([key, count]) => {
    const [relationType, direction] = key.split('|') as [string, BlockingRelationDirection];
    return { relationType, direction, count };
  });
};

export const throwDeletionBlocked = (entity: string, rows: readonly BlockingRelation[]): never => {
  throw new BadRequestException({
    message: `Cannot delete ${entity}: blocking links found`,
    blockingRelations: rows,
    summary: blockingRelationsSummary(rows),
  });
};
