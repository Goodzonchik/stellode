import {
  serviceSpaDiagramPath,
  serviceSpaIntegrationsDiagramPath,
} from './spa-diagram-paths';

export const SERVICE_FROM_QUERY = 'fromService' as const;

export const SERVICE_PROJECTION_DRAFT_QUERY = 'projection=draft' as const;

export const serviceIntegrationsPathWithFrom = (
  serviceId: string,
  searchParams?: URLSearchParams,
): string => serviceSpaIntegrationsDiagramPath(serviceId, searchParams);

export const serviceDiagramPath = (
  serviceId: string,
  searchParams?: URLSearchParams,
): string => serviceSpaDiagramPath(serviceId, searchParams);

export const serviceDiagramApiPath = (
  serviceId: string,
  projection: 'on-prod' | 'draft',
): string =>
  projection === 'draft'
    ? `/diagrams/service/${encodeURIComponent(serviceId)}?projection=draft`
    : `/diagrams/service/${encodeURIComponent(serviceId)}`;

export const serviceIntegrationsDiagramApiPath = (
  serviceId: string,
  projection: 'on-prod' | 'draft',
): string =>
  projection === 'draft'
    ? `/diagrams/service/${encodeURIComponent(serviceId)}/integrations?projection=draft`
    : `/diagrams/service/${encodeURIComponent(serviceId)}/integrations`;
