import type { ArchitectureGraph } from '@stellode/models';

export type ImpactHttpTarget = { segment: string; resourceId: string };

const parentFeatureId = (graph: ArchitectureGraph, fvId: string): string | undefined => {
  const rel = graph.relationships.find(
    (r) => (r.type === 'HAS_VERSION' || r.type === 'HAS_DRAFT') && r.to === fvId,
  );
  if (!rel) return undefined;
  const parent = graph.nodes.find((n) => n.id === rel.from);
  return parent?.labels.includes('Feature') ? parent.id : undefined;
};

const parentApplicationId = (graph: ArchitectureGraph, avId: string): string | undefined => {
  const rel = graph.relationships.find((r) => r.type === 'HAS_VERSION' && r.to === avId);
  if (!rel) return undefined;
  const parent = graph.nodes.find((n) => n.id === rel.from);
  return parent?.labels.includes('Application') ? parent.id : undefined;
};

export const resolveImpactHttpTarget = (
  graph: ArchitectureGraph,
  nodeId: string,
): ImpactHttpTarget | null => {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const { labels } = node;
  if (labels.includes('Unit')) return { segment: 'unit', resourceId: nodeId };
  if (labels.includes('Team')) return { segment: 'team', resourceId: nodeId };
  if (labels.includes('Service')) return { segment: 'service', resourceId: nodeId };
  if (labels.includes('Feature')) return { segment: 'feature', resourceId: nodeId };
  if (labels.includes('Application')) return { segment: 'application', resourceId: nodeId };
  if (labels.includes('Component')) {
    return { segment: 'component', resourceId: nodeId };
  }
  if (labels.includes('ComponentVersion')) {
    return { segment: 'component-version', resourceId: nodeId };
  }
  if (labels.includes('FeatureVersion')) {
    const fid = parentFeatureId(graph, nodeId);
    return fid ? { segment: 'feature', resourceId: fid } : null;
  }
  if (labels.includes('ApplicationVersion')) {
    const aid = parentApplicationId(graph, nodeId);
    return aid ? { segment: 'application', resourceId: aid } : null;
  }
  return null;
};
