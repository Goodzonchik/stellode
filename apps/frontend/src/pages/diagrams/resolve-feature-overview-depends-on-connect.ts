import type { ArchitectureGraph } from '@stellode/models';
import { featureDiagramCenterFeatureVersionId } from './feature-diagram-center-feature-version-id';

const usesComponentVersionIdsByComponentId = (
  graph: ArchitectureGraph,
  featureVersionId: string,
): ReadonlyMap<string, readonly string[]> => {
  const byComp = new Map<string, string[]>();
  for (const rel of graph.relationships) {
    if (rel.type !== 'USES_COMPONENT_VERSION') continue;
    const cvId =
      rel.from === featureVersionId ? rel.to : rel.to === featureVersionId ? rel.from : null;
    if (!cvId) continue;
    const parent = graph.relationships.find(
      (r) =>
        (r.type === 'HAS_VERSION' || r.type === 'HAS_DRAFT') && r.to === cvId && r.from !== undefined,
    );
    const componentId = parent?.from;
    if (!componentId) continue;
    const list = byComp.get(componentId) ?? [];
    list.push(cvId);
    byComp.set(componentId, list);
  }
  return byComp;
};

export type ResolveFeatureOverviewDependsOnConnectResult =
  | { readonly kind: 'direct'; readonly consumerCvId: string; readonly providerCvId: string }
  | null;

export const resolveFeatureOverviewDependsOnConnect = (
  graph: ArchitectureGraph,
  featureId: string,
  sourceId: string,
  targetId: string,
  flowNodes: ReadonlyArray<{ id: string; data: { type?: string } }>,
): ResolveFeatureOverviewDependsOnConnectResult => {
  const sourceNode = flowNodes.find((n) => n.id === sourceId);
  const targetNode = flowNodes.find((n) => n.id === targetId);
  const sourceType = sourceNode?.data.type ?? '';
  const targetType = targetNode?.data.type ?? '';
  const fvId = featureDiagramCenterFeatureVersionId(graph, featureId);
  if (!fvId) return null;
  if (sourceType === 'componentVersion' && targetType === 'componentVersion') {
    return { kind: 'direct', consumerCvId: sourceId, providerCvId: targetId };
  }
  if (sourceType !== 'component' || targetType !== 'component') return null;
  const isProjectedCv = (id: string): boolean =>
    graph.nodes.some((node) => node.id === id && node.labels.includes('ComponentVersion'));
  if (isProjectedCv(sourceId) && isProjectedCv(targetId)) {
    return { kind: 'direct', consumerCvId: sourceId, providerCvId: targetId };
  }
  const byComp = usesComponentVersionIdsByComponentId(graph, fvId);
  const consumerCvs = byComp.get(sourceId) ?? [];
  const providerCvs = byComp.get(targetId) ?? [];
  if (consumerCvs.length === 1 && providerCvs.length === 1) {
    return {
      kind: 'direct',
      consumerCvId: consumerCvs[0],
      providerCvId: providerCvs[0],
    };
  }
  return null;
};
