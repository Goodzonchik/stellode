import { BadRequestException } from '@nestjs/common';
import {
  BlockingRelationDirection,
  blockingRelationsSummary,
  parseBlockingRelations,
  throwDeletionBlocked,
} from './version-delete';

describe('parseBlockingRelations', () => {
  it('parses valid rows', () => {
    const rows = [
      {
        relationType: 'DEPENDS_ON',
        direction: BlockingRelationDirection.Incoming,
        targetId: 'id1',
        targetKind: 'ComponentVersion',
        targetName: 'A',
      },
    ];
    expect(parseBlockingRelations(rows)).toEqual([
      {
        relationType: 'DEPENDS_ON',
        direction: BlockingRelationDirection.Incoming,
        targetId: 'id1',
        targetKind: 'ComponentVersion',
        targetName: 'A',
      },
    ]);
  });

  it('filters invalid rows', () => {
    expect(parseBlockingRelations([{ relationType: 1 }])).toEqual([]);
  });

  it('handles non-array', () => {
    expect(parseBlockingRelations(null)).toEqual([]);
  });
});

describe('blockingRelationsSummary', () => {
  it('aggregates by relation and direction', () => {
    const rows = [
      {
        relationType: 'X',
        direction: BlockingRelationDirection.Incoming,
        targetId: 'a',
        targetKind: 'K',
        targetName: 'n',
      },
      {
        relationType: 'X',
        direction: BlockingRelationDirection.Incoming,
        targetId: 'b',
        targetKind: 'K',
        targetName: 'm',
      },
    ];
    expect(blockingRelationsSummary(rows)).toEqual([
      { relationType: 'X', direction: BlockingRelationDirection.Incoming, count: 2 },
    ]);
  });
});

describe('throwDeletionBlocked', () => {
  it('throws with payload', () => {
    const rows = [
      {
        relationType: 'R',
        direction: BlockingRelationDirection.Outgoing,
        targetId: 'x',
        targetKind: 'T',
        targetName: 'N',
      },
    ];
    expect(() => throwDeletionBlocked('entity', rows)).toThrow(BadRequestException);
    try {
      throwDeletionBlocked('entity', rows);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const r = (e as BadRequestException).getResponse() as Record<string, unknown>;
      expect(r.message).toContain('entity');
      expect(r.blockingRelations).toEqual(rows);
    }
  });
});
