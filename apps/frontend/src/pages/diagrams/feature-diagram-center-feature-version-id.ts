import type { ArchitectureGraph } from '@stellode/models';

export const featureDiagramCenterFeatureVersionId = (
  graph: ArchitectureGraph,
  featureId: string,
): string | null => {
  const draft = graph.relationships.find((r) => r.type === 'HAS_DRAFT' && r.from === featureId);
  if (draft) return draft.to;
  const versions = graph.relationships.filter((r) => r.type === 'HAS_VERSION' && r.from === featureId);
  if (versions.length === 0) return null;
  let best: string | null = null;
  let bestNum = Number.NEGATIVE_INFINITY;
  for (const rel of versions) {
    const node = graph.nodes.find((n) => n.id === rel.to && n.labels.includes('FeatureVersion'));
    const raw = node?.versionNumber;
    const num = raw === undefined ? NaN : Number(raw);
    const ord = Number.isFinite(num) ? num : -1;
    if (ord >= bestNum) {
      bestNum = ord;
      best = rel.to;
    }
  }
  return best;
};
