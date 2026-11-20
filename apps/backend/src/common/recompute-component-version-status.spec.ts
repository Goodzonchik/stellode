import { VersionStatus } from '@stellode/models';
import { recomputeComponentVersionStatuses } from './recompute-component-version-status';
import type { Neo4jService } from '../neo4j/neo4j.service';

const mockNeo4j = (rows: Array<{ cvId: string; currentStatus: string; edgeStatus: string | null }>) => {
  const read = jest.fn().mockResolvedValue({
    records: rows.map((row) => ({
      get: (key: string) => {
        if (key === 'cvId') return row.cvId;
        if (key === 'currentStatus') return row.currentStatus;
        if (key === 'edgeStatus') return row.edgeStatus;
        return null;
      },
    })),
  });
  const write = jest.fn().mockResolvedValue({ records: [] });
  return { read, write } as unknown as Neo4jService & { read: jest.Mock; write: jest.Mock };
};

describe('recomputeComponentVersionStatuses', () => {
  it('returns empty for empty id list', async () => {
    const neo4j = mockNeo4j([]);
    await expect(recomputeComponentVersionStatuses(neo4j, [])).resolves.toEqual([]);
    expect(neo4j.read).not.toHaveBeenCalled();
  });

  it('keeps draft and does not write', async () => {
    const neo4j = mockNeo4j([
      { cvId: 'cv1', currentStatus: 'draft', edgeStatus: null },
    ]);
    await expect(recomputeComponentVersionStatuses(neo4j, ['cv1'])).resolves.toEqual([]);
    expect(neo4j.write).not.toHaveBeenCalled();
  });

  it('sets unactive when no current edges', async () => {
    const neo4j = mockNeo4j([
      { cvId: 'cv1', currentStatus: 'active', edgeStatus: null },
    ]);
    const changes = await recomputeComponentVersionStatuses(neo4j, ['cv1']);
    expect(changes).toEqual([
      {
        componentVersionId: 'cv1',
        fromStatus: VersionStatus.Active,
        toStatus: VersionStatus.Unactive,
      },
    ]);
    expect(neo4j.write).toHaveBeenCalledWith(
      expect.stringContaining('SET cv.status'),
      expect.objectContaining({ id: 'cv1', status: VersionStatus.Unactive }),
    );
  });

  it('stays active when one app has active and another deprecated', async () => {
    const neo4j = mockNeo4j([
      { cvId: 'cv1', currentStatus: 'active', edgeStatus: 'active' },
      { cvId: 'cv1', currentStatus: 'active', edgeStatus: 'deprecated' },
    ]);
    await expect(recomputeComponentVersionStatuses(neo4j, ['cv1'])).resolves.toEqual([]);
    expect(neo4j.write).not.toHaveBeenCalled();
  });

  it('sets deprecated when only deprecated edges remain', async () => {
    const neo4j = mockNeo4j([
      { cvId: 'cv1', currentStatus: 'active', edgeStatus: 'deprecated' },
    ]);
    const changes = await recomputeComponentVersionStatuses(neo4j, ['cv1']);
    expect(changes[0]?.toStatus).toBe(VersionStatus.Deprecated);
  });
});
