import type { Neo4jService } from '../neo4j/neo4j.service';
import { resolveComponentOrVersionToVersionId } from './resolve-component-or-version-to-version-id';

const valueRecord = (value: string) => ({
  get: (key: string) => (key === 'value' ? value : undefined),
});

describe('resolveComponentOrVersionToVersionId', () => {
  it('returns id when direct ComponentVersion lookup finds a node', async () => {
    const read = jest.fn().mockResolvedValueOnce({ records: [valueRecord('cv-direct')] });
    const neo4j = { read } as unknown as Neo4jService;
    await expect(resolveComponentOrVersionToVersionId(neo4j, 'cv-direct')).resolves.toBe(
      'cv-direct',
    );
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (cv:ComponentVersion {id: $id})'),
      { id: 'cv-direct' },
    );
  });

  it('falls back to HAS_DRAFT when ComponentVersion lookup is empty', async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({ records: [valueRecord('cv-draft')] });
    const neo4j = { read } as unknown as Neo4jService;
    await expect(resolveComponentOrVersionToVersionId(neo4j, 'comp-1')).resolves.toBe('cv-draft');
    expect(read).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenLastCalledWith(expect.stringContaining('[:HAS_DRAFT]'), {
      id: 'comp-1',
    });
  });

  it('falls back to latest HAS_VERSION when no draft', async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({ records: [valueRecord('cv-latest')] });
    const neo4j = { read } as unknown as Neo4jService;
    await expect(resolveComponentOrVersionToVersionId(neo4j, 'comp-2')).resolves.toBe('cv-latest');
    expect(read).toHaveBeenCalledTimes(3);
    expect(read).toHaveBeenLastCalledWith(
      expect.stringContaining('ORDER BY cv.versionNumber DESC'),
      { id: 'comp-2' },
    );
  });

  it('returns null when nothing matches', async () => {
    const read = jest.fn().mockResolvedValue({ records: [] });
    const neo4j = { read } as unknown as Neo4jService;
    await expect(resolveComponentOrVersionToVersionId(neo4j, 'missing')).resolves.toBeNull();
    expect(read).toHaveBeenCalledTimes(3);
  });
});
