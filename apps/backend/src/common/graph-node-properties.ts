import type { GraphNode } from '../neo4j/neo4j.service';

export const getGraphNodeProperties = (node: GraphNode): Record<string, unknown> =>
  node.properties ?? {};
