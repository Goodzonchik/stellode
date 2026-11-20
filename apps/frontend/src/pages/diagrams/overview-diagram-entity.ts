const overviewEntities = new Set([
  'unit',
  'team',
  'service',
  'service-integrations',
  'component',
]);

export const isCrossUnitDiagramPath = (pathname: string): boolean =>
  /\/units\/[^/]+\/diagram\/cross-unit\/?$/.test(pathname);

export const isOverviewDiagramEntity = (
  entity: string | undefined,
  pathname: string,
): boolean => {
  if (isCrossUnitDiagramPath(pathname)) return true;
  if (entity === undefined || entity === '') return false;
  return overviewEntities.has(entity);
};
