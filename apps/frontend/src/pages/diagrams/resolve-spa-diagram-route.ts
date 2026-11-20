import type { SpaDiagramEntity } from './spa-diagram-paths';

export type SpaDiagramRoute = {
  readonly entity: SpaDiagramEntity;
  readonly id: string;
};

const matchSegment = (
  pathname: string,
  pattern: RegExp,
): RegExpMatchArray | null => pathname.match(pattern);

export const resolveSpaDiagramRoute = (pathname: string): SpaDiagramRoute | null => {
  const integrations = matchSegment(
    pathname,
    /^\/services\/([^/]+)\/diagram\/integrations\/?$/,
  );
  if (integrations?.[1]) {
    return { entity: 'service-integrations', id: decodeURIComponent(integrations[1]) };
  }
  const service = matchSegment(pathname, /^\/services\/([^/]+)\/diagram\/?$/);
  if (service?.[1]) {
    return { entity: 'service', id: decodeURIComponent(service[1]) };
  }
  const unit = matchSegment(pathname, /^\/units\/([^/]+)\/diagram\/?$/);
  if (unit?.[1]) {
    return { entity: 'unit', id: decodeURIComponent(unit[1]) };
  }
  const team = matchSegment(pathname, /^\/teams\/([^/]+)\/diagram\/?$/);
  if (team?.[1]) {
    return { entity: 'team', id: decodeURIComponent(team[1]) };
  }
  const component = matchSegment(pathname, /^\/components\/([^/]+)\/diagram\/?$/);
  if (component?.[1]) {
    return { entity: 'component', id: decodeURIComponent(component[1]) };
  }
  const featureVersion = matchSegment(
    pathname,
    /^\/feature-versions\/([^/]+)\/diagram\/?$/,
  );
  if (featureVersion?.[1]) {
    return {
      entity: 'feature-version',
      id: decodeURIComponent(featureVersion[1]),
    };
  }
  return null;
};
