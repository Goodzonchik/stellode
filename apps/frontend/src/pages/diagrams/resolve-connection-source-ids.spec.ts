import type { ViewNode } from '@stellode/models';
import { resolveConnectionSourceIds } from './resolve-connection-source-ids';

const viewNode = (id: string, sourceId?: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type: 'componentVersion', ...(sourceId !== undefined ? { sourceId } : {}) },
});

describe('resolveConnectionSourceIds', () => {
  it('maps copies to their source ids and keeps plain ids', () => {
    const nodes = [viewNode('app::cv1', 'cv1'), viewNode('cv2')];
    expect(resolveConnectionSourceIds({ source: 'app::cv1', target: 'cv2' }, nodes)).toEqual({
      source: 'cv1',
      target: 'cv2',
    });
  });

  it('returns empty string for null endpoints and passes through unknown ids', () => {
    expect(resolveConnectionSourceIds({ source: null, target: 'x' }, [])).toEqual({ source: '', target: 'x' });
  });
});
