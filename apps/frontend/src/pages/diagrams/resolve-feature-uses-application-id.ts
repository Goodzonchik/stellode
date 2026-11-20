import type { ArchitectureGraph } from '@stellode/models';

export const resolveFeatureUsesApplicationId = (
  graph: ArchitectureGraph,
  featureVersionId: string,
  componentVersionId: string,
): string | null => {
  const matches = graph.relationships.filter((relationship) => {
    if (relationship.type !== 'USES_COMPONENT_VERSION') return false;
    const isForward =
      relationship.from === featureVersionId && relationship.to === componentVersionId;
    const isReverse =
      relationship.to === featureVersionId && relationship.from === componentVersionId;
    return isForward || isReverse;
  });
  if (matches.length === 0) return null;
  const applicationId = matches[0].properties?.applicationId;
  return typeof applicationId === 'string' && applicationId.length > 0 ? applicationId : null;
};
