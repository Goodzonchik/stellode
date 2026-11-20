import type { ViewEdge, ViewNode } from '@stellode/models';
import { applicationCopyNodeId } from './application-copy-node-id';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import type { FeatureVersionCompareDiff } from './diff-feature-version-compare-sets';
import { dependsOnCompareKey } from './feature-version-compare-sets';

const resolveDiffStatus = (
  key: string,
  added: ReadonlySet<string>,
  removed: ReadonlySet<string>,
): 'added' | 'removed' | undefined => {
  if (added.has(key)) return 'added';
  if (removed.has(key)) return 'removed';
  return undefined;
};

const componentVersionIdFromNode = (node: ViewNode): string =>
  node.data.sourceId ?? node.id;

const parseCompositionKey = (
  key: string,
): { componentVersionId: string; applicationId: string } | undefined => {
  const separator = key.indexOf('::');
  if (separator <= 0 || separator >= key.length - 2) return undefined;
  return {
    componentVersionId: key.slice(0, separator),
    applicationId: key.slice(separator + 2),
  };
};

const compositionCopyStatusById = (
  keys: ReadonlySet<string>,
  status: 'added' | 'removed',
  into: Map<string, 'added' | 'removed'>,
): void => {
  for (const key of keys) {
    const parsed = parseCompositionKey(key);
    if (parsed === undefined) continue;
    into.set(
      applicationCopyNodeId(parsed.applicationId, parsed.componentVersionId),
      status,
    );
  }
};

const withDiffStatus = (
  node: ViewNode,
  status: 'added' | 'removed',
): ViewNode => ({
  ...node,
  data: { ...node.data, diffStatus: status },
});

const markCompositionNodes = (
  nodes: readonly ViewNode[],
  diff: FeatureVersionCompareDiff,
): ViewNode[] => {
  const statusByCopyId = new Map<string, 'added' | 'removed'>();
  compositionCopyStatusById(diff.removed.composition, 'removed', statusByCopyId);
  compositionCopyStatusById(diff.added.composition, 'added', statusByCopyId);
  return nodes.map((node) => {
    const byCopyId = statusByCopyId.get(node.id);
    if (byCopyId !== undefined) return withDiffStatus(node, byCopyId);
    const applicationId = node.data.applicationId ?? node.parentId;
    if (applicationId === undefined || applicationId === '') return node;
    const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
    if (
      typeKey !== 'component' &&
      typeKey !== 'dependency' &&
      typeKey !== 'componentVersion'
    ) {
      return node;
    }
    const copyId = applicationCopyNodeId(
      applicationId,
      componentVersionIdFromNode(node),
    );
    const status = statusByCopyId.get(copyId);
    return status === undefined ? node : withDiffStatus(node, status);
  });
};

const markContainerNodes = (
  nodes: readonly ViewNode[],
  diff: FeatureVersionCompareDiff,
): ViewNode[] =>
  nodes.map((node) => {
    const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
    if (typeKey === 'app') {
      const status = resolveDiffStatus(
        node.id,
        diff.added.applications,
        diff.removed.applications,
      );
      return status === undefined ? node : withDiffStatus(node, status);
    }
    if (typeKey === 'unit') {
      const status = resolveDiffStatus(node.id, diff.added.units, diff.removed.units);
      return status === undefined ? node : withDiffStatus(node, status);
    }
    return node;
  });

const endpointCvId = (
  nodeId: string,
  nodesById: ReadonlyMap<string, ViewNode>,
): string => {
  const node = nodesById.get(nodeId);
  if (node === undefined) return nodeId;
  return componentVersionIdFromNode(node);
};

const markEdge = (
  edge: ViewEdge,
  diff: FeatureVersionCompareDiff,
  nodesById: ReadonlyMap<string, ViewNode>,
): ViewEdge => {
  if (edge.relationshipType === 'MAINTAINS' || edge.relationshipType === 'HAS_TEAM') {
    return edge;
  }
  if (edge.relationshipType === 'DEPENDS_ON') {
    const key = dependsOnCompareKey(
      endpointCvId(edge.source, nodesById),
      endpointCvId(edge.target, nodesById),
    );
    const status = resolveDiffStatus(key, diff.added.dependsOn, diff.removed.dependsOn);
    if (status === undefined) return edge;
    return {
      ...edge,
      diffStatus: status,
      style: {
        stroke: status === 'added' ? '#5aad7a' : '#d07070',
        strokeWidth: 2.5,
      },
    };
  }
  return edge;
};

export const applyFeatureVersionCompareDiffStatus = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  diff: FeatureVersionCompareDiff,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const withComposition = markCompositionNodes(nodes, diff);
  const markedNodes = markContainerNodes(withComposition, diff);
  const nodesById = new Map(markedNodes.map((node) => [node.id, node]));
  return {
    nodes: markedNodes,
    edges: edges.map((edge) => markEdge(edge, diff, nodesById)),
  };
};
