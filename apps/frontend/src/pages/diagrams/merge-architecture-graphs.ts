import type { ArchitectureGraph, ArchitectureRelationship, Node } from '@stellode/models';

const mergeById = <T extends { id: string }>(
  primary: readonly T[],
  secondary: readonly T[],
): T[] => {
  const map = new Map<string, T>();
  for (const item of secondary) map.set(item.id, item);
  for (const item of primary) map.set(item.id, item);
  return [...map.values()];
};

export const mergeArchitectureGraphs = (
  primary: ArchitectureGraph,
  secondary: ArchitectureGraph,
): ArchitectureGraph => ({
  nodes: mergeById<Node>(primary.nodes, secondary.nodes),
  relationships: mergeById<ArchitectureRelationship>(
    primary.relationships,
    secondary.relationships,
  ),
});
