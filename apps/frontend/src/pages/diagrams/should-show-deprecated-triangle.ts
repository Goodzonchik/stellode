import type { ViewNode } from '@stellode/models';

export type StatusWarningTriangleKind = 'deprecated' | 'unactive';

const hasVersionMarker = (data: ViewNode['data']): boolean =>
  data.actualVersion !== undefined || data.actualVersionNumber !== undefined;

export const statusWarningTriangleKind = (
  data: ViewNode['data'],
): StatusWarningTriangleKind | null => {
  if (data.diffStatus === 'added' || data.diffStatus === 'removed') return null;
  if (!hasVersionMarker(data)) return null;
  if (data.applicationStatus === 'deprecated') return 'deprecated';
  if (data.status === 'unactive') return 'unactive';
  return null;
};

export const shouldShowDeprecatedTriangle = (data: ViewNode['data']): boolean =>
  statusWarningTriangleKind(data) !== null;
