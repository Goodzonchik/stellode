import type { ArchitectureGraph, ArchitectureRelationship } from '@stellode/models';

export const crossUnitBridgeRel = (ta: string, tb: string): ArchitectureRelationship => ({
  id: `CROSS_UNIT_LINK:${ta}:${tb}`,
  from: ta,
  to: tb,
  type: 'CROSS_UNIT_LINK',
  properties: {},
});

export const mergeStarCrossUnitBridges = (
  graph: ArchitectureGraph,
  centerUnitId: string,
  peerUnitIds: ReadonlyArray<string>,
): ArchitectureGraph => {
  const seen = new Set<string>();
  const bridges = peerUnitIds.flatMap((peerId) => {
    if (peerId === centerUnitId) return [];
    if (seen.has(peerId)) return [];
    seen.add(peerId);
    return [crossUnitBridgeRel(centerUnitId, peerId)];
  });
  return { nodes: graph.nodes, relationships: [...graph.relationships, ...bridges] };
};
