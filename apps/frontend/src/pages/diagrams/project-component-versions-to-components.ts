import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

export type ProjectComponentVersionsOptions = {
  readonly keepComponentIds?: readonly string[];
};

const versionLinkTypes = new Set(['HAS_VERSION', 'HAS_DRAFT']);

const nodeType = (node: ViewNode): string => normalizeDiagramNodeTypeKey(node.data.type);

const isComponent = (node: ViewNode): boolean => isComponentLikeType(nodeType(node));

const isComponentVersion = (node: ViewNode): boolean => nodeType(node) === 'componentVersion';

const projectedNodeType = (parent: ViewNode): string =>
  nodeType(parent) === 'dependency' ? 'dependency' : 'component';

const parentByVersionId = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): ReadonlyMap<string, string> => {
  const ids = new Set(nodes.map((node) => node.id));
  return new Map(
    edges
      .filter((edge) => versionLinkTypes.has(edge.relationshipType))
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .flatMap((edge) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (source === undefined || target === undefined) return [];
        if (isComponent(source) && isComponentVersion(target)) return [[target.id, source.id] as const];
        if (isComponent(target) && isComponentVersion(source)) return [[source.id, target.id] as const];
        return [];
      }),
  );
};

const childrenByParentId = (
  parentByVersion: ReadonlyMap<string, string>,
): ReadonlyMap<string, readonly string[]> => {
  const acc = new Map<string, string[]>();
  for (const [versionId, parentId] of parentByVersion) {
    const list = acc.get(parentId) ?? [];
    list.push(versionId);
    acc.set(parentId, list);
  }
  return acc;
};

const toProjectedComponent = (cv: ViewNode, parent: ViewNode): ViewNode => ({
  ...cv,
  data: {
    ...cv.data,
    type: projectedNodeType(parent),
    label: parent.data.label,
    ...(parent.data.isDependency === true ? { isDependency: true } : {}),
    actualVersion: cv.data.actualVersion ?? cv.data.draftVersion,
    actualVersionNumber: cv.data.actualVersionNumber ?? cv.data.draftVersionNumber,
    sourceId: cv.id,
  },
});

const endpointVariants = (
  id: string,
  childrenByParent: ReadonlyMap<string, readonly string[]>,
  keptParents: ReadonlySet<string>,
  removedParents: ReadonlySet<string>,
): string[] => {
  const children = childrenByParent.get(id);
  if (children === undefined) return [id];
  if (keptParents.has(id)) return [id, ...children];
  if (removedParents.has(id)) return [...children];
  return [id];
};

const expandEdge = (
  edge: ViewEdge,
  childrenByParent: ReadonlyMap<string, readonly string[]>,
  keptParents: ReadonlySet<string>,
  removedParents: ReadonlySet<string>,
): ViewEdge[] => {
  const sources = endpointVariants(edge.source, childrenByParent, keptParents, removedParents);
  const targets = endpointVariants(edge.target, childrenByParent, keptParents, removedParents);
  return sources.flatMap((source) =>
    targets
      .filter((target) => source !== target)
      .map((target) =>
        source === edge.source && target === edge.target
          ? edge
          : { ...edge, id: `${edge.id}::${source}>${target}`, source, target },
      ),
  );
};

const isComponentVersionLink = (
  edge: ViewEdge,
  projectedVersionIds: ReadonlySet<string>,
  componentParentIds: ReadonlySet<string>,
): boolean => {
  if (!versionLinkTypes.has(edge.relationshipType)) return false;
  const touchesProjected =
    projectedVersionIds.has(edge.source) || projectedVersionIds.has(edge.target);
  const touchesParent =
    componentParentIds.has(edge.source) || componentParentIds.has(edge.target);
  return touchesProjected && touchesParent;
};

export const projectComponentVersionsToComponents = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  options: ProjectComponentVersionsOptions = {},
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const keptParents = new Set(options.keepComponentIds ?? []);
  const parentByVersion = parentByVersionId(nodes, edges);
  if (parentByVersion.size === 0) return { nodes: [...nodes], edges: [...edges] };
  const childrenByParent = childrenByParentId(parentByVersion);
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
  const projectedVersionIds = new Set(parentByVersion.keys());
  const componentParentIds = new Set(parentByVersion.values());
  const removedParents = new Set(
    [...childrenByParent.keys()].filter((parentId) => !keptParents.has(parentId)),
  );
  const nextNodes = nodes.flatMap((node) => {
    if (projectedVersionIds.has(node.id)) {
      const parentId = parentByVersion.get(node.id);
      const parent = parentId !== undefined ? nodeById.get(parentId) : undefined;
      return parent === undefined ? [node] : [toProjectedComponent(node, parent)];
    }
    if (removedParents.has(node.id)) return [];
    return [node];
  });
  const nextEdges = edges
    .filter((edge) => !isComponentVersionLink(edge, projectedVersionIds, componentParentIds))
    .flatMap((edge) => expandEdge(edge, childrenByParent, keptParents, removedParents));
  return { nodes: nextNodes, edges: nextEdges };
};
