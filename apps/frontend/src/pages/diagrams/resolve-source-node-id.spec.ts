import type { ViewNode } from '@stellode/models';
import { resolveSourceNodeId } from './resolve-source-node-id';

const viewNode = (id: string, sourceId?: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: 'component', ...(sourceId !== undefined ? { sourceId } : {}) },
});

describe('resolveSourceNodeId', () => {
  it('returns sourceId for an application copy', () => {
    expect(resolveSourceNodeId(viewNode('app::c', 'c'))).toBe('c');
  });

  it('returns id for a plain node', () => {
    expect(resolveSourceNodeId(viewNode('c'))).toBe('c');
  });
});
