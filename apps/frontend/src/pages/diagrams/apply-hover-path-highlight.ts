import type { ViewEdge, ViewNode } from '@stellode/models';
import type { HoverPathIds } from './collect-hover-path-ids';

const hoverStroke = '#1677ff';
const hoverStrokeWidth = 3;

const withNodeHoverFlag = (
  node: ViewNode,
  path: HoverPathIds | null,
): ViewNode => ({
  ...node,
  data: {
    ...node.data,
    hoverHighlighted: path?.nodeIds.has(node.id) === true,
  },
});

const withEdgeHoverStyle = (
  edge: ViewEdge,
  path: HoverPathIds | null,
): ViewEdge => {
  if (path?.edgeIds.has(edge.id) !== true) return edge;
  return {
    ...edge,
    style: { ...edge.style, stroke: hoverStroke, strokeWidth: hoverStrokeWidth },
  };
};

export const applyHoverPathHighlight = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  path: HoverPathIds | null,
): { readonly nodes: ViewNode[]; readonly edges: ViewEdge[] } => ({
  nodes: nodes.map((node) => withNodeHoverFlag(node, path)),
  edges: edges.map((edge) => withEdgeHoverStyle(edge, path)),
});
