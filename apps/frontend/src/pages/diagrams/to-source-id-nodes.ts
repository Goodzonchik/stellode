import type { ViewNode } from '@stellode/models';
import { resolveSourceNodeId } from './resolve-source-node-id';

export const toSourceIdNodes = (nodes: readonly ViewNode[]): ViewNode[] =>
  nodes.map((node) => ({ ...node, id: resolveSourceNodeId(node) }));
