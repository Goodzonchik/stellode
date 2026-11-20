export type SpaDiagramEntity =
  | 'unit'
  | 'team'
  | 'service'
  | 'service-integrations'
  | 'feature-version'
  | 'component';

export const unitDiagramPath = (unitId: string): string =>
  `/units/${encodeURIComponent(unitId)}/diagram`;

export const unitCrossUnitDiagramPath = (unitId: string): string =>
  `/units/${encodeURIComponent(unitId)}/diagram/cross-unit`;

export const teamDiagramPath = (teamId: string): string =>
  `/teams/${encodeURIComponent(teamId)}/diagram`;

export const serviceSpaDiagramPath = (
  serviceId: string,
  searchParams?: URLSearchParams,
): string => {
  const base = `/services/${encodeURIComponent(serviceId)}/diagram`;
  return searchParams?.get('projection') === 'draft' ? `${base}?projection=draft` : base;
};

export const serviceSpaIntegrationsDiagramPath = (
  serviceId: string,
  searchParams?: URLSearchParams,
): string => {
  const params = new URLSearchParams();
  params.set('fromService', serviceId);
  if (searchParams?.get('projection') === 'draft') {
    params.set('projection', 'draft');
  }
  return `/services/${encodeURIComponent(serviceId)}/diagram/integrations?${params.toString()}`;
};

export const featureDiagramPath = (featureId: string): string =>
  `/features/${encodeURIComponent(featureId)}/diagram`;

export const featureVersionDiagramPath = (featureVersionId: string): string =>
  `/feature-versions/${encodeURIComponent(featureVersionId)}/diagram`;

export const componentDiagramPath = (componentId: string): string =>
  `/components/${encodeURIComponent(componentId)}/diagram`;

export const applicationDiagramPath = (applicationId: string): string =>
  `/applications/${encodeURIComponent(applicationId)}/diagram`;

export const applicationVersionDiagramPath = (
  applicationId: string,
  version: string,
): string =>
  `/applications/${encodeURIComponent(applicationId)}/versions/${encodeURIComponent(version)}/diagram`;
