import type { ArchitectureGraph } from '@stellode/models';
import {
  diffFeatureVersionCompareSets,
  type FeatureVersionCompareDiff,
} from './diff-feature-version-compare-sets';
import { extractFeatureVersionCompareSets } from './extract-feature-version-compare-sets';
import type { FlatDiagram } from './flat-diagram';
import { mergeArchitectureGraphs } from './merge-architecture-graphs';
import { projectFeatureVersionFlatDiagram } from './project-feature-version-flat-diagram';
import { withImpactFlags } from './with-impact-flags';

export type FeatureVersionCompareBase = {
  readonly flat: FlatDiagram;
  readonly diff: FeatureVersionCompareDiff;
};

export const buildFeatureVersionFlatBase = (
  graph: ArchitectureGraph,
  featureVersionId: string,
): FlatDiagram => {
  const projected = projectFeatureVersionFlatDiagram(graph, featureVersionId);
  return { nodes: withImpactFlags(projected.nodes, null), edges: projected.edges };
};

export const buildFeatureVersionCompareBase = (
  currentGraph: ArchitectureGraph,
  previousGraph: ArchitectureGraph,
  featureVersionId: string,
): FeatureVersionCompareBase => ({
  diff: diffFeatureVersionCompareSets(
    extractFeatureVersionCompareSets(currentGraph),
    extractFeatureVersionCompareSets(previousGraph),
  ),
  flat: buildFeatureVersionFlatBase(
    mergeArchitectureGraphs(currentGraph, previousGraph),
    featureVersionId,
  ),
});
