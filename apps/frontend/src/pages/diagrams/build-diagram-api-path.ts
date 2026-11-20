import type { SpaDiagramEntity } from './spa-diagram-paths';
import {
  serviceDiagramApiPath,
  serviceIntegrationsDiagramApiPath,
} from './service-scope-tabs';

export const buildDiagramApiPath = (
  entity: SpaDiagramEntity,
  id: string,
  serviceProjection: 'on-prod' | 'draft',
): string => {
  if (entity === 'service') {
    return serviceDiagramApiPath(id, serviceProjection);
  }
  if (entity === 'service-integrations') {
    return serviceIntegrationsDiagramApiPath(id, serviceProjection);
  }
  return `/diagrams/${entity}/${encodeURIComponent(id)}`;
};
