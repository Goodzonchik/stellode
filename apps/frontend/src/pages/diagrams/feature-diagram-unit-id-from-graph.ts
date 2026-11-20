import type { ArchitectureGraph } from '@stellode/models';
import { parentFeatureElementIdFromGraph } from './parent-feature-element-id-from-graph';

export const featureDiagramUnitIdFromGraph = (
  graph: ArchitectureGraph | null,
  entity: string | undefined,
  diagramAnchorId: string | undefined,
): string | undefined => {
  if (!graph || !diagramAnchorId || !entity) return undefined;
  if (entity !== 'feature-version') return undefined;

  const featureElementId = parentFeatureElementIdFromGraph(graph, diagramAnchorId);
  if (!featureElementId) return undefined;

  const node = graph.nodes.find(
    (n) => n.id === featureElementId && n.labels.includes('Feature'),
  );
  const tid = node?.unitId;
  return typeof tid === 'string' && tid.length > 0 ? tid : undefined;
};
