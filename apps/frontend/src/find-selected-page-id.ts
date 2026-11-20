const FEATURE_VERSIONS_PREFIX = '/feature-versions';

export const findSelectedPageId = (
  pathname: string,
  pageIds: readonly string[],
): string | undefined => {
  if (
    pathname === FEATURE_VERSIONS_PREFIX ||
    pathname.startsWith(`${FEATURE_VERSIONS_PREFIX}/`)
  ) {
    return pageIds.includes('features') ? 'features' : undefined;
  }
  const pageId = pageIds.find((id) => pathname === `/${id}` || pathname.startsWith(`/${id}/`));
  return pageId;
};
