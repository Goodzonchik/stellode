import type { ArchitectureGraph } from '@stellode/models';

export const isServiceDiagramEntity = (entity: string | undefined): boolean =>
  entity === 'service' || entity === 'service-integrations';

export const isServiceArchived = (
  graph: ArchitectureGraph | null,
  serviceId: string | undefined,
): boolean => {
  if (!graph || !serviceId) return false;
  const node = graph.nodes.find(
    (n) => n.id === serviceId && n.labels.includes('Service'),
  );
  return node?.status === 'archive';
};
