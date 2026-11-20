import type { ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const isUnitGroup = (node: ViewNode): boolean =>
  node.type === 'group' && normalizeDiagramNodeTypeKey(node.data.type) === 'unit';

export const orderBridgeNodesForReactFlow = (nodes: readonly ViewNode[]): ViewNode[] => {
  const units = nodes.filter(isUnitGroup);
  const roots = nodes.filter((node) => !isUnitGroup(node) && node.parentId === undefined);
  const unitChildren = nodes.filter(
    (node) => node.parentId !== undefined && units.some((unit) => unit.id === node.parentId),
  );
  const nested = nodes.filter(
    (node) =>
      node.parentId !== undefined && !units.some((unit) => unit.id === node.parentId),
  );
  return [...units, ...roots, ...unitChildren, ...nested];
};
