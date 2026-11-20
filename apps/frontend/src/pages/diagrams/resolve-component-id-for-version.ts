import type { ArchitectureGraph } from '@stellode/models';

const versionLinkTypes = new Set(['HAS_VERSION', 'HAS_DRAFT']);

export const resolveComponentIdForVersion = (
  graph: ArchitectureGraph,
  componentVersionId: string,
): string | null => {
  const rel = graph.relationships.find(
    (r) =>
      versionLinkTypes.has(r.type) &&
      (r.to === componentVersionId || r.from === componentVersionId),
  );
  if (!rel) return null;
  const parentId = rel.to === componentVersionId ? rel.from : rel.to;
  const parent = graph.nodes.find((n) => n.id === parentId);
  return parent?.labels.includes('Component') ? parent.id : null;
};
