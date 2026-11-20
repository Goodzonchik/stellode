import type { ViewNode } from '@stellode/models';
import { resolveSourceNodeId } from './resolve-source-node-id';

type ConnectionEndpoints = { source: string | null; target: string | null };

const sourceIdOf = (id: string | null, nodes: readonly ViewNode[]): string => {
  if (id === null) return '';
  const node = nodes.find((candidate) => candidate.id === id);
  return node === undefined ? id : resolveSourceNodeId(node);
};

export const resolveConnectionSourceIds = (
  connection: ConnectionEndpoints,
  nodes: readonly ViewNode[],
): { source: string; target: string } => ({
  source: sourceIdOf(connection.source, nodes),
  target: sourceIdOf(connection.target, nodes),
});
