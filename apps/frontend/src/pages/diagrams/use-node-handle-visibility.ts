import { useCallback } from 'react';
import { useStore } from '@xyflow/react';
import { shallow } from 'zustand/shallow';

type HandleVisibility = readonly [hasIncoming: boolean, hasOutgoing: boolean];

const collectHandleVisibility = (
  edges: readonly { source: string; target: string }[],
  nodeId: string,
): HandleVisibility => {
  const hasIncoming = edges.some((edge) => edge.target === nodeId);
  const hasOutgoing = edges.some((edge) => edge.source === nodeId);
  return [hasIncoming, hasOutgoing] as const;
};

export const useNodeHandleVisibility = (nodeId: string): HandleVisibility =>
  useStore(
    useCallback((state) => collectHandleVisibility(state.edges, nodeId), [nodeId]),
    shallow,
  );
