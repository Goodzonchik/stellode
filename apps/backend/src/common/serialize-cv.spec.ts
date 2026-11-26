import { VersionStatus } from '@stellode/models';
import { serializeCv } from './graph-helpers';
import type { GraphNode } from '../neo4j/neo4j.service';

const node = (properties: Record<string, unknown>, id = 'node-id'): GraphNode => ({
  id,
  label: 'ComponentVersion',
  properties,
});

describe('serializeCv', () => {
  it('prefers properties.id and normalizes status', () => {
    const result = serializeCv(
      node({ id: 'cv-1', version: '1.0.0', status: 'active', name: 'Auth' }),
    );
    expect(result).toEqual({
      id: 'cv-1',
      version: '1.0.0',
      status: VersionStatus.Active,
      name: 'Auth',
    });
  });

  it('falls back to node.id and legacy state field', () => {
    const result = serializeCv(node({ version: '2.0.0', state: 'draft' }, 'fallback-id'));
    expect(result.id).toBe('fallback-id');
    expect(result.status).toBe(VersionStatus.Draft);
  });

  it('defaults unknown status to unactive', () => {
    expect(serializeCv(node({ id: 'cv-2', status: 'weird' })).status).toBe(
      VersionStatus.Unactive,
    );
  });
});
