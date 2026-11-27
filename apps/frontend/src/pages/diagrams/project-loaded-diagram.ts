import type { ArchitectureGraph, ImpactQueryMode, ViewEdge } from '@stellode/models';
import { architectureGraphToDiagram } from '../../common/architecture-graph-to-diagram';
import { clearFeatureDraftVersionFields } from './clear-feature-draft-version-fields';
import {
  applyServiceAggregationDiagramView,
  inferDiagramImpactMode,
  markDependsOnAnomalies,
} from './diagram-production-overlays';
import { filterUnitCurrentComposition } from './filter-unit-current-composition';
import type { FlatDiagram } from './flat-diagram';
import { mergeTeamDiagramNodes } from './merge-team-diagram-nodes';
import {
  applicationVersionOnlyMergeConfig,
  mergeVersionNodes,
  overviewVersionMergeConfig,
} from './merge-version-nodes';
import { isOverviewDiagramEntity } from './overview-diagram-entity';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';
import { projectUnitOverviewDiagram } from './project-unit-overview-diagram';
import type { SpaDiagramEntity } from './spa-diagram-paths';
import { withImpactFlags } from './with-impact-flags';

export type ServiceProjectionMode = 'on-prod' | 'draft';

export type LoadedDiagramRoute = {
  readonly entity: SpaDiagramEntity;
  readonly diagramAnchorId: string;
  readonly pathname: string;
  readonly serviceProjection: ServiceProjectionMode;
};

export type LoadedDiagramProjection = {
  readonly flat: FlatDiagram;
  readonly mode: ImpactQueryMode;
};

const anomalyEdgeStyle = { stroke: '#c0392b', strokeWidth: 2.5 };

export const styleAnomalyEdges = (edges: readonly ViewEdge[]): ViewEdge[] =>
  edges.map((edge) => (edge.diagramAnomaly ? { ...edge, style: { ...anomalyEdgeStyle } } : edge));

const projectByEntity = (
  diagram: FlatDiagram,
  route: LoadedDiagramRoute,
): FlatDiagram => {
  const { entity, diagramAnchorId, pathname } = route;
  if (entity === 'unit') return projectUnitOverviewDiagram(diagram.nodes, diagram.edges);
  if (
    entity === 'feature-version' ||
    entity === 'component' ||
    isOverviewDiagramEntity(entity, pathname)
  ) {
    return projectComponentVersionsToComponents(diagram.nodes, diagram.edges, {
      ...(entity === 'component' ? { keepComponentIds: [diagramAnchorId] } : {}),
    });
  }
  return diagram;
};

const mergeByEntity = (projected: FlatDiagram, route: LoadedDiagramRoute): FlatDiagram => {
  const { entity, pathname } = route;
  if (entity === 'unit') {
    const unitProjected = filterUnitCurrentComposition(projected.nodes, projected.edges);
    return mergeVersionNodes(unitProjected.nodes, unitProjected.edges, overviewVersionMergeConfig);
  }
  if (entity === 'feature-version' || entity === 'component') {
    return mergeVersionNodes(projected.nodes, projected.edges, applicationVersionOnlyMergeConfig);
  }
  if (!isOverviewDiagramEntity(entity, pathname)) return projected;
  return entity === 'team'
    ? mergeTeamDiagramNodes(projected.nodes, projected.edges)
    : mergeVersionNodes(projected.nodes, projected.edges, overviewVersionMergeConfig);
};

export const projectLoadedDiagram = (
  raw: ArchitectureGraph,
  route: LoadedDiagramRoute,
): LoadedDiagramProjection => {
  const { entity, diagramAnchorId, serviceProjection } = route;
  const diagram = architectureGraphToDiagram(raw);
  const mode = inferDiagramImpactMode(raw, entity, diagramAnchorId, serviceProjection);
  const taggedEdges = markDependsOnAnomalies(raw, mode, diagram.edges);
  const merged = mergeByEntity(projectByEntity({ nodes: diagram.nodes, edges: taggedEdges }, route), route);
  const svcView = applyServiceAggregationDiagramView(
    raw,
    entity,
    mode,
    diagramAnchorId,
    merged.nodes,
    merged.edges,
  );
  const canvasNodes =
    entity === 'team' ? clearFeatureDraftVersionFields(svcView.nodes) : svcView.nodes;
  return {
    flat: { nodes: withImpactFlags(canvasNodes, null), edges: styleAnomalyEdges(svcView.edges) },
    mode,
  };
};
