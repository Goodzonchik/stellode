import type { ViewEdge, ViewNode } from '@stellode/models';
import { collectFeatureVersionCompositionNodeIds } from './collect-feature-version-composition-node-ids';
import {
  collectFeatureVersionRemoteNodeIds,
  isCrossUnitDependsOnEdge,
} from './collect-feature-version-remote-node-ids';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { UnitDiagramNodeKind, viewNodeUnitKind } from './unit-diagram-type-visibility';

const isAlwaysHiddenType = (typeKey: string): boolean =>
  typeKey === 'feature' || typeKey === 'featureVersion' || typeKey === 'service';

export type FeatureVersionDiagramVisibilityOptions = {
  readonly teamsVisible?: boolean;
  readonly crossUnitLinksVisible?: boolean;
  readonly featureVersionIds?: readonly string[];
};

const isNodeVisible = (
  node: ViewNode,
  remoteIds: ReadonlySet<string>,
  teamsVisible: boolean,
  crossUnitLinksVisible: boolean,
): boolean => {
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  if (isAlwaysHiddenType(typeKey)) return false;
  const kind = viewNodeUnitKind(node);
  if (kind === UnitDiagramNodeKind.Unit) return false;
  if (kind === UnitDiagramNodeKind.Feature || kind === UnitDiagramNodeKind.Service) return false;
  if (kind === UnitDiagramNodeKind.Team) {
    if (!teamsVisible) return false;
    if (remoteIds.has(node.id)) return false;
    return true;
  }
  if (!crossUnitLinksVisible && remoteIds.has(node.id)) return false;
  return true;
};

export const applyFeatureVersionDiagramVisibility = (
  nodes: ViewNode[],
  edges: ViewEdge[],
  teamsVisibleOrOptions: boolean | FeatureVersionDiagramVisibilityOptions = true,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const options: FeatureVersionDiagramVisibilityOptions =
    typeof teamsVisibleOrOptions === 'boolean'
      ? { teamsVisible: teamsVisibleOrOptions, crossUnitLinksVisible: false }
      : teamsVisibleOrOptions;
  const teamsVisible = options.teamsVisible !== false;
  const crossUnitLinksVisible = options.crossUnitLinksVisible === true;
  const featureVersionIds = options.featureVersionIds ?? [];
  const remoteIds = collectFeatureVersionRemoteNodeIds(nodes, edges, featureVersionIds);
  const compositionIds = collectFeatureVersionCompositionNodeIds(
    nodes,
    edges,
    featureVersionIds,
  );
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const visibleById = new Map(
    nodes.map(
      (node) =>
        [
          node.id,
          isNodeVisible(node, remoteIds, teamsVisible, crossUnitLinksVisible),
        ] as const,
    ),
  );
  const nextNodes = nodes.map((node) => ({
    ...node,
    hidden: !(visibleById.get(node.id) ?? true),
  }));
  const nextEdges = edges.map((edge) => {
    const endsVisible =
      (visibleById.get(edge.source) ?? false) && (visibleById.get(edge.target) ?? false);
    const hideCrossUnit =
      !crossUnitLinksVisible && isCrossUnitDependsOnEdge(edge, byId, compositionIds);
    return { ...edge, hidden: !endsVisible || hideCrossUnit };
  });
  return { nodes: nextNodes, edges: nextEdges };
};
