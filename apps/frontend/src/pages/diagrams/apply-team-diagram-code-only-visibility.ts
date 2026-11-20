import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const isCodeOnlyHiddenType = (typeKey: string): boolean =>
  typeKey === 'feature' || typeKey === 'featureVersion' || typeKey === 'service';

const isNodeVisibleWhenCodeOnly = (node: ViewNode): boolean =>
  !isCodeOnlyHiddenType(normalizeDiagramNodeTypeKey(node.data.type));

export const applyTeamDiagramCodeOnlyVisibility = (
  nodes: ViewNode[],
  edges: ViewEdge[],
  codeOnly: boolean,
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  if (!codeOnly) return { nodes, edges };
  const visibleById = new Map(
    nodes.map(
      (node) =>
        [
          node.id,
          node.hidden !== true && isNodeVisibleWhenCodeOnly(node),
        ] as const,
    ),
  );
  const nextNodes = nodes.map((node) => ({
    ...node,
    hidden: !(visibleById.get(node.id) ?? true),
  }));
  const nextEdges = edges.map((edge) => ({
    ...edge,
    hidden: !((visibleById.get(edge.source) ?? false) && (visibleById.get(edge.target) ?? false)),
  }));
  return { nodes: nextNodes, edges: nextEdges };
};
