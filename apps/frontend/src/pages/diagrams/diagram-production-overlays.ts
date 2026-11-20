import type { ArchitectureGraph, ImpactQueryMode, ViewEdge, ViewNode } from '@stellode/models';
import { ImpactQueryMode as ImpactQueryModeConst } from '@stellode/models';
import { parseVersionStatus, VersionStatus } from '@stellode/models';
import { isServiceDiagramEntity } from './service-diagram-entity';

const isCv = (n: { labels: readonly string[] }) => n.labels.includes('ComponentVersion');

const isStatusWarningPair = (from: VersionStatus, to: VersionStatus): boolean => {
  const key = `${from}->${to}`;
  return (
    key === 'active->draft' ||
    key === 'active->deprecated' ||
    key === 'deprecated->draft' ||
    key === 'deprecated->deprecated' ||
    key === 'active->unactive' ||
    key === 'deprecated->unactive'
  );
};

export type ServiceDiagramProjection = ImpactQueryMode;

export const inferDiagramImpactMode = (
  graph: ArchitectureGraph,
  entity: string | undefined,
  diagramId: string | undefined,
  serviceProjection?: ServiceDiagramProjection,
): ImpactQueryMode => {
  if (isServiceDiagramEntity(entity)) {
    return serviceProjection === ImpactQueryModeConst.Draft
      ? ImpactQueryModeConst.Draft
      : ImpactQueryModeConst.OnProd;
  }
  if (entity === 'team') {
    return ImpactQueryModeConst.OnProd;
  }
  if (!entity || !diagramId) return ImpactQueryModeConst.Draft;
  const anchor = graph.nodes.find((n) => n.id === diagramId);
  if (!anchor) return ImpactQueryModeConst.Draft;
  if (entity === 'feature-version' && anchor.labels.includes('FeatureVersion')) {
    const s = parseVersionStatus(anchor.status);
    return s === VersionStatus.Active
      ? ImpactQueryModeConst.OnProd
      : ImpactQueryModeConst.Draft;
  }
  if (entity === 'component-version' && anchor.labels.includes('ComponentVersion')) {
    const s = parseVersionStatus(anchor.status);
    return s === VersionStatus.Active || s === VersionStatus.Deprecated
      ? ImpactQueryModeConst.OnProd
      : ImpactQueryModeConst.Draft;
  }
  if (entity === 'application-version' && anchor.labels.includes('ApplicationVersion')) {
    return anchor.status === 'current' ? ImpactQueryModeConst.OnProd : ImpactQueryModeConst.Draft;
  }
  return ImpactQueryModeConst.Draft;
};

export const markDependsOnAnomalies = (
  graph: ArchitectureGraph,
  mode: ImpactQueryMode,
  edges: ViewEdge[],
): ViewEdge[] => {
  if (mode !== ImpactQueryModeConst.OnProd) return edges;
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const anomalyRelIds = new Set<string>();
  for (const rel of graph.relationships) {
    if (rel.type !== 'DEPENDS_ON') continue;
    const fromN = nodeById.get(rel.from);
    const toN = nodeById.get(rel.to);
    if (!fromN || !toN || !isCv(fromN) || !isCv(toN)) continue;
    const fromSt = parseVersionStatus(fromN.status);
    const toSt = parseVersionStatus(toN.status);
    if (!fromSt || !toSt) continue;
    if (toSt === VersionStatus.Unactive) anomalyRelIds.add(rel.id);
    else if (isStatusWarningPair(fromSt, toSt)) anomalyRelIds.add(rel.id);
  }
  return edges.map((e) =>
    anomalyRelIds.has(e.id) ? { ...e, diagramAnomaly: true } : { ...e, diagramAnomaly: false },
  );
};

const aggregatesBetween = (
  graph: ArchitectureGraph,
  from: string,
  to: string,
): ArchitectureGraph['relationships'] =>
  graph.relationships.filter(
    (r) => r.type === 'AGGREGATES' && r.from === from && r.to === to,
  );

const hasActiveAggregateBetween = (graph: ArchitectureGraph, from: string, to: string): boolean =>
  aggregatesBetween(graph, from, to).some((r) => r.properties?.deleted !== true);

const isDeletedOnlyAggregateViewEdge = (graph: ArchitectureGraph, e: ViewEdge): boolean => {
  if (e.relationshipType !== 'AGGREGATES') return false;
  const rels = aggregatesBetween(graph, e.source, e.target);
  return rels.length > 0 && !rels.some((r) => r.properties?.deleted !== true);
};

export const applyServiceAggregationDiagramView = (
  graph: ArchitectureGraph,
  entity: string | undefined,
  mode: ImpactQueryMode,
  diagramAnchorId: string | undefined,
  nodes: ViewNode[],
  edges: ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  if (!isServiceDiagramEntity(entity) || !diagramAnchorId) return { nodes, edges };
  const withStaleStyle =
    mode === ImpactQueryModeConst.Draft
      ? edges.map((e) =>
          isDeletedOnlyAggregateViewEdge(graph, e)
            ? {
                ...e,
                style: {
                  ...e.style,
                  strokeDasharray: '6 4',
                  opacity: 0.55,
                },
              }
            : e,
        )
      : edges;
  if (mode !== ImpactQueryModeConst.OnProd) return { nodes, edges: withStaleStyle };
  const filteredEdges = withStaleStyle.filter(
    (e) =>
      e.relationshipType !== 'AGGREGATES' ||
      hasActiveAggregateBetween(graph, e.source, e.target),
  );
  const featuresWithActiveAgg = new Set(
    filteredEdges
      .filter(
        (e) =>
          e.relationshipType === 'AGGREGATES' &&
          e.source === diagramAnchorId,
      )
      .map((e) => e.target),
  );
  const filteredNodes = nodes.filter((n) => {
    const gn = graph.nodes.find((x) => x.id === n.id);
    if (!gn?.labels.includes('Feature')) return true;
    return featuresWithActiveAgg.has(n.id);
  });
  return { nodes: filteredNodes, edges: filteredEdges };
};
