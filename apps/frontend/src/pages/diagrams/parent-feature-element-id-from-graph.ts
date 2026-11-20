import type { ArchitectureGraph } from '@stellode/models';

const parentLinkTypes = new Set(['HAS_VERSION', 'HAS_DRAFT']);

export const parentFeatureElementIdFromGraph = (
  graph: ArchitectureGraph,
  featureVersionId: string,
): string | null => {
  for (const relation of graph.relationships) {
    if (!parentLinkTypes.has(relation.type)) continue;
    const ends = [relation.from, relation.to];
    if (!ends.includes(featureVersionId)) continue;
    const otherId = relation.from === featureVersionId ? relation.to : relation.from;
    const other = graph.nodes.find((node) => node.id === otherId);
    if (other?.labels.includes('Feature') === true) return otherId;
  }
  return null;
};
