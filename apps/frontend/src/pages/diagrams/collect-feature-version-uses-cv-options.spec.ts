import type { ViewNode } from '@stellode/models';
import { collectFeatureVersionUsesCvOptions } from './collect-feature-version-uses-cv-options';

const viewNode = (
  id: string,
  type: string,
  extras: Partial<ViewNode['data']> & { parentId?: string } = {},
): ViewNode => {
  const { parentId, ...data } = extras;
  return {
    id,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: { label: data.label ?? id, type, ...data },
    ...(parentId !== undefined ? { parentId } : {}),
  };
};

describe('collectFeatureVersionUsesCvOptions', () => {
  it('lists nested component/dependency on the canvas excluding consumer', () => {
    const nodes = [
      viewNode('cv1-copy', 'component', {
        label: 'Alpha · 1',
        sourceId: 'cv1',
        applicationId: 'app1',
        parentId: 'app1',
      }),
      viewNode('cv2-copy', 'dependency', {
        label: 'Beta · 2',
        sourceId: 'cv2',
        applicationId: 'app1',
        parentId: 'app1',
      }),
      viewNode('app1', 'app', { label: 'App' }),
    ];
    expect(collectFeatureVersionUsesCvOptions(nodes, 'cv1')).toEqual([
      { id: 'cv2', applicationId: 'app1', label: 'Beta · 2' },
    ]);
  });

  it('skips flat components without Application parent', () => {
    const nodes = [
      viewNode('cv2', 'component', { label: 'Beta', applicationId: 'app1' }),
    ];
    expect(collectFeatureVersionUsesCvOptions(nodes, 'cv1')).toEqual([]);
  });
});
