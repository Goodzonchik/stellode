import type { ViewEdge } from '@stellode/models';

export const keepEdgesAmongNodes = (
  edges: readonly ViewEdge[],
  nodeIds: ReadonlySet<string>,
): ViewEdge[] => edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
