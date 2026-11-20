import type {
  ArchitectureGraph,
  ArchitectureRelationship,
  Node,
} from '@stellode/models';

export const mergeArchitectureGraphs = (
  base: ArchitectureGraph,
  extra: ArchitectureGraph,
): ArchitectureGraph => {
  const nodesById = new Map<string, Node>();
  for (const node of base.nodes) {
    nodesById.set(node.id, node);
  }
  for (const node of extra.nodes) {
    nodesById.set(node.id, node);
  }
  const relsById = new Map<string, ArchitectureRelationship>();
  for (const rel of base.relationships) {
    relsById.set(rel.id, rel);
  }
  for (const rel of extra.relationships) {
    relsById.set(rel.id, rel);
  }
  return {
    nodes: [...nodesById.values()],
    relationships: [...relsById.values()],
  };
};
