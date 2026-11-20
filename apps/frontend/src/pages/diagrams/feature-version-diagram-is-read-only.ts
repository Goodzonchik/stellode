import { parseVersionStatus, VersionStatus, type ArchitectureGraph } from '@stellode/models';

export const featureVersionDiagramIsReadOnly = (
  entity: string | undefined,
  diagramAnchorId: string | undefined,
  graph: ArchitectureGraph | null,
): boolean => {
  if (entity !== 'feature-version' || diagramAnchorId === undefined || graph === null) {
    return false;
  }
  const anchor = graph.nodes.find((node) => node.id === diagramAnchorId);
  if (anchor === undefined || !anchor.labels.includes('FeatureVersion')) {
    return false;
  }
  const status = parseVersionStatus(anchor.status);
  return status !== null && status !== VersionStatus.Draft;
};
