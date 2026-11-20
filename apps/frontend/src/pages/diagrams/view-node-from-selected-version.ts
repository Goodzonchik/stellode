import type { SelectedVersion } from './AddComponentDialog';
import type { ViewNode } from '@stellode/models';

type PositionCoordinates = { x: number; y: number };

export const viewNodeFromSelectedVersion = (
  cv: SelectedVersion,
  position: PositionCoordinates,
): ViewNode => ({
  id: cv.id,
  type: 'custom',
  draggable: true,
  position,
  data: {
    label: cv.componentName,
    type: 'componentVersion',
    actualVersion: cv.version,
    actualVersionNumber: cv.versionNumber,
    ...(cv.status !== undefined ? { status: cv.status } : {}),
  },
});
