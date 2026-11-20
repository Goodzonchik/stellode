import type { DependsOnConnection } from './depends-on-connection';
import { isDependsOnEndpointType } from './is-depends-on-endpoint-type';

export const resolveDependsOnConnection = (
  sourceId: string,
  targetId: string,
  nodes: Array<{ id: string; data: { type?: string } }>,
): DependsOnConnection | null => {
  const nodeById = (id: string) => nodes.find((n) => n.id === id);
  const s = nodeById(sourceId);
  const t = nodeById(targetId);
  if (!s || !t) return null;
  const st = s.data.type ?? '';
  const tt = t.data.type ?? '';
  if (isDependsOnEndpointType(st) && isDependsOnEndpointType(tt)) {
    return {
      providerComponentVersionId: targetId,
      consumerComponentVersionId: sourceId,
    };
  }
  if (isDependsOnEndpointType(st) && !isDependsOnEndpointType(tt)) {
    return {
      providerComponentVersionId: sourceId,
      consumerComponentVersionId: null,
      contextHint: { id: targetId, nodeType: tt },
    };
  }
  if (isDependsOnEndpointType(tt) && !isDependsOnEndpointType(st)) {
    return {
      providerComponentVersionId: targetId,
      consumerComponentVersionId: null,
      contextHint: { id: sourceId, nodeType: st },
    };
  }
  return null;
};
