import type { ArchitectureGraph, Node } from '@stellode/models';

const isArchivedServiceNode = (node: Node): boolean =>
  node.labels.includes('Service') && node.status === 'archive';

export type ExcludeArchivedServicesOptions = Readonly<{
  retainServiceIds?: readonly string[];
}>;

export const excludeArchivedServicesOnProd = (
  graph: ArchitectureGraph,
  options: ExcludeArchivedServicesOptions = {},
): ArchitectureGraph => {
  const retain = new Set(options.retainServiceIds ?? []);
  const removedIds = new Set(
    graph.nodes
      .filter((node) => isArchivedServiceNode(node) && !retain.has(node.id))
      .map((node) => node.id),
  );
  if (removedIds.size === 0) {
    return graph;
  }
  const nodes = graph.nodes.filter((node) => !removedIds.has(node.id));
  const relationships = graph.relationships.filter(
    (rel) => !removedIds.has(rel.from) && !removedIds.has(rel.to),
  );
  return { nodes, relationships };
};
