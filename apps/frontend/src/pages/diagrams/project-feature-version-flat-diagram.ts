import type { ArchitectureGraph, ViewEdge, ViewNode } from '@stellode/models';
import { architectureGraphToDiagram } from '../../common/architecture-graph-to-diagram';
import {
  inferDiagramImpactMode,
  markDependsOnAnomalies,
} from './diagram-production-overlays';
import {
  applicationVersionOnlyMergeConfig,
  mergeVersionNodes,
} from './merge-version-nodes';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';

export const projectFeatureVersionFlatDiagram = (
  graph: ArchitectureGraph,
  featureVersionId: string,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const diagram = architectureGraphToDiagram(graph);
  const mode = inferDiagramImpactMode(graph, 'feature-version', featureVersionId, 'on-prod');
  const taggedEdges = markDependsOnAnomalies(graph, mode, diagram.edges);
  const projected = projectComponentVersionsToComponents(diagram.nodes, taggedEdges);
  return mergeVersionNodes(
    projected.nodes,
    projected.edges,
    applicationVersionOnlyMergeConfig,
  );
};
