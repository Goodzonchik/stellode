import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

const nodeUnitId = (node: ViewNode | undefined): string | undefined => {
  if (node === undefined) return undefined;
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  if (typeKey === 'unit') return node.id;
  const unitId = node.data.unitId;
  return typeof unitId === 'string' && unitId.length > 0 ? unitId : undefined;
};

const isComponentEndpoint = (node: ViewNode | undefined): boolean => {
  if (node === undefined) return false;
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  return isComponentLikeType(typeKey) || typeKey === 'componentVersion';
};

export const collectFeatureVersionCrossUnitIds = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): ReadonlySet<string> => {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const unitIds = new Set<string>();
  for (const edge of edges) {
    if (edge.relationshipType !== 'DEPENDS_ON') continue;
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!isComponentEndpoint(source) || !isComponentEndpoint(target)) continue;
    const sourceUnitId = nodeUnitId(source);
    const targetUnitId = nodeUnitId(target);
    if (
      sourceUnitId === undefined ||
      targetUnitId === undefined ||
      sourceUnitId === targetUnitId
    ) {
      continue;
    }
    unitIds.add(sourceUnitId);
    unitIds.add(targetUnitId);
  }
  return unitIds;
};
