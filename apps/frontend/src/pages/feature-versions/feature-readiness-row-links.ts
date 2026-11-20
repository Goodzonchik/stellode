import { buildListHighlightSearch } from '../../common/list-highlight/build-list-highlight-search';

export const featureReadinessApplicationPath = (
  applicationId: string,
  unitId: string,
): string => {
  const search = buildListHighlightSearch({
    highlight: applicationId,
    ctx: { unitId },
  });
  return `/applications?${search}`;
};

export const featureReadinessComponentPath = (componentId: string, unitId: string): string => {
  const search = buildListHighlightSearch({
    highlight: componentId,
    ctx: { unitId },
  });
  return `/components?${search}`;
};
