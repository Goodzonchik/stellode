import type { ViewEdge } from '@stellode/models';

const DEPENDS_ON = 'DEPENDS_ON';
const PATH_OFFSET = 24;

const undirectedPairKey = (source: string, target: string): string =>
  source < target ? `${source}::${target}` : `${target}::${source}`;

const collectBidirectionalPairKeys = (edges: readonly ViewEdge[]): ReadonlySet<string> => {
  const directed = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of edges) {
    if (edge.relationshipType !== DEPENDS_ON) continue;
    const reverse = `${edge.target}->${edge.source}`;
    if (directed.has(reverse)) pairs.add(undirectedPairKey(edge.source, edge.target));
    directed.add(`${edge.source}->${edge.target}`);
  }
  return pairs;
};

const pathOffsetForDependsOn = (
  edge: ViewEdge,
  bidirectionalPairs: ReadonlySet<string>,
): number => {
  if (!bidirectionalPairs.has(undirectedPairKey(edge.source, edge.target))) return 0;
  return edge.source < edge.target ? PATH_OFFSET : -PATH_OFFSET;
};

const annotateDependsOnEdge = (
  edge: ViewEdge,
  bidirectionalPairs: ReadonlySet<string>,
): ViewEdge => {
  const pathOffset = pathOffsetForDependsOn(edge, bidirectionalPairs);
  return {
    ...edge,
    type: 'dependsOn',
    markerEnd: { type: 'arrowclosed' },
    pathOffset,
    data: { pathOffset },
  };
};

export const prepareDependsOnCanvasEdges = (edges: readonly ViewEdge[]): ViewEdge[] => {
  const bidirectionalPairs = collectBidirectionalPairKeys(edges);
  return edges.map((edge) =>
    edge.relationshipType === DEPENDS_ON
      ? annotateDependsOnEdge(edge, bidirectionalPairs)
      : edge,
  );
};
