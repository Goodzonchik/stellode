import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const isApplicationType = (type: string): boolean =>
  type === 'app' || type === 'application';

const isEmptyApplicationNode = (node: ViewNode): boolean =>
  node.type !== 'group' && isApplicationType(normalizeDiagramNodeTypeKey(node.data.type));

const withoutEmptyApplications = (nodes: readonly ViewNode[]): ViewNode[] =>
  nodes.filter((node) => !isEmptyApplicationNode(node));

const withoutOwnsEdges = (edges: readonly ViewEdge[]): ViewEdge[] =>
  edges.filter((edge) => edge.relationshipType !== 'OWNS');

const nodeIds = (nodes: readonly ViewNode[]): ReadonlySet<string> =>
  new Set(nodes.map((node) => node.id));

const edgesAmongNodes = (
  edges: readonly ViewEdge[],
  ids: ReadonlySet<string>,
): ViewEdge[] => edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));

export const filterUnitDiagramCanvas = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const nextNodes = withoutEmptyApplications(nodes);
  const nextEdges = edgesAmongNodes(withoutOwnsEdges(edges), nodeIds(nextNodes));
  return { nodes: nextNodes, edges: nextEdges };
};
