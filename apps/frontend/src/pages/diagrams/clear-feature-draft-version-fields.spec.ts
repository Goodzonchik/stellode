import type { ViewNode } from '@stellode/models';
import { clearFeatureDraftVersionFields } from './clear-feature-draft-version-fields';

const featureNode = (): ViewNode => ({
  id: 'f1',
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: {
    label: 'Feature A',
    type: 'feature',
    actualVersion: '2.0',
    actualVersionNumber: 2,
    draftVersion: '3.0-draft',
    draftVersionNumber: 3,
  },
});

describe('clearFeatureDraftVersionFields', () => {
  it('removes draft fields on Feature and keeps actual', () => {
    const [out] = clearFeatureDraftVersionFields([featureNode()]);
    expect(out?.data.actualVersion).toBe('2.0');
    expect(out?.data.actualVersionNumber).toBe(2);
    expect(out?.data.draftVersion).toBeUndefined();
    expect(out?.data.draftVersionNumber).toBeUndefined();
  });

  it('leaves non-Feature nodes unchanged', () => {
    const service: ViewNode = {
      id: 's1',
      type: 'custom',
      draggable: true,
      position: { x: 0, y: 0 },
      data: {
        label: 'Svc',
        type: 'service',
        draftVersion: 'keep',
      },
    };
    const [out] = clearFeatureDraftVersionFields([service]);
    expect(out?.data.draftVersion).toBe('keep');
  });
});
