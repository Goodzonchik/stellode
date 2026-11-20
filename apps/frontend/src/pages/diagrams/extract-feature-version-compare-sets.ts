import type { ArchitectureGraph, Label } from '@stellode/models';
import { GraphLabel } from '@stellode/models';
import { coerceDiagramId } from './coerce-diagram-id';
import {
  compositionCompareKey,
  dependsOnCompareKey,
  type FeatureVersionCompareSets,
} from './feature-version-compare-sets';

const nodeIdsWithLabel = (graph: ArchitectureGraph, label: Label): Set<string> => {
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (node.labels.includes(label)) {
      ids.add(node.id);
    }
  }
  return ids;
};

const componentVersionIds = (graph: ArchitectureGraph): ReadonlySet<string> => {
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (node.labels.includes(GraphLabel.ComponentVersion)) {
      ids.add(node.id);
    }
  }
  return ids;
};

const usesComponentVersionId = (
  from: string,
  to: string,
  cvIds: ReadonlySet<string>,
): string | undefined => {
  if (cvIds.has(to)) return to;
  if (cvIds.has(from)) return from;
  return coerceDiagramId(to);
};

const relationshipApplicationId = (
  properties: ArchitectureGraph['relationships'][number]['properties'],
): string | undefined =>
  coerceDiagramId(properties?.['applicationId']) ??
  coerceDiagramId(properties?.['application_id']);

export const extractFeatureVersionCompareSets = (
  graph: ArchitectureGraph,
): FeatureVersionCompareSets => {
  const composition = new Set<string>();
  const dependsOn = new Set<string>();
  const cvIds = componentVersionIds(graph);
  for (const rel of graph.relationships) {
    if (rel.type === 'USES_COMPONENT_VERSION') {
      const applicationId = relationshipApplicationId(rel.properties);
      const componentVersionId = usesComponentVersionId(rel.from, rel.to, cvIds);
      if (applicationId !== undefined && componentVersionId !== undefined) {
        composition.add(compositionCompareKey(componentVersionId, applicationId));
      }
      continue;
    }
    if (rel.type === 'DEPENDS_ON') {
      const sourceId = coerceDiagramId(rel.from);
      const targetId = coerceDiagramId(rel.to);
      if (sourceId !== undefined && targetId !== undefined) {
        dependsOn.add(dependsOnCompareKey(sourceId, targetId));
      }
    }
  }
  return {
    composition,
    dependsOn,
    applications: nodeIdsWithLabel(graph, GraphLabel.Application),
    units: nodeIdsWithLabel(graph, GraphLabel.Unit),
  };
};
