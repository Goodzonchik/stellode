import type { ViewNode } from '@stellode/models';
import { resolveSourceNodeId } from './resolve-source-node-id';

export const withImpactFlags = (nodes: ViewNode[], ids: Set<string> | null): ViewNode[] =>
  nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      impactHighlighted: ids?.has(resolveSourceNodeId(node)) ?? false,
    },
  }));
