import type { ViewEdge, ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

const versionLinkTypes = new Set(['HAS_VERSION', 'HAS_DRAFT']);

const nodeType = (node: ViewNode): string => normalizeDiagramNodeTypeKey(node.data.type);

const isUnit = (node: ViewNode): boolean => nodeType(node) === 'unit';

const isComponent = (node: ViewNode): boolean => isComponentLikeType(nodeType(node));

const isComponentVersion = (node: ViewNode): boolean => nodeType(node) === 'componentVersion';

const isFeature = (node: ViewNode): boolean => nodeType(node) === 'feature';

const isFeatureVersion = (node: ViewNode): boolean => nodeType(node) === 'featureVersion';

const parentByVersionId = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  isParent: (node: ViewNode) => boolean,
  isVersion: (node: ViewNode) => boolean,
): ReadonlyMap<string, string> => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return new Map(
    edges
      .filter((edge) => versionLinkTypes.has(edge.relationshipType))
      .flatMap((edge) => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (source === undefined || target === undefined) return [];
        if (isParent(source) && isVersion(target)) return [[target.id, source.id] as const];
        if (isParent(target) && isVersion(source)) return [[source.id, target.id] as const];
        return [];
      }),
  );
};

const resolveId = (id: string, parentByVersion: ReadonlyMap<string, string>): string =>
  parentByVersion.get(id) ?? id;

const usesEdgeKey = (edge: ViewEdge): string => {
  const app = edge.applicationId ?? '';
  return `${edge.source}|${edge.target}|${app}`;
};

const remapEdgeEnds = (
  edge: ViewEdge,
  cvToComponent: ReadonlyMap<string, string>,
  fvToFeature: ReadonlyMap<string, string>,
): ViewEdge => {
  const withComponent = {
    source: resolveId(edge.source, cvToComponent),
    target: resolveId(edge.target, cvToComponent),
  };
  const source =
    edge.relationshipType === 'USES_COMPONENT_VERSION'
      ? resolveId(withComponent.source, fvToFeature)
      : withComponent.source;
  const target =
    edge.relationshipType === 'USES_COMPONENT_VERSION'
      ? resolveId(withComponent.target, fvToFeature)
      : withComponent.target;
  if (source === edge.source && target === edge.target) return edge;
  return { ...edge, id: `${edge.id}::${source}>${target}`, source, target };
};

const toUsesEdge = (edge: ViewEdge): ViewEdge => ({
  ...edge,
  label: 'USES',
  relationshipType: 'USES_COMPONENT_VERSION',
});

const isComponentVersionLink = (
  edge: ViewEdge,
  cvIds: ReadonlySet<string>,
): boolean =>
  versionLinkTypes.has(edge.relationshipType) &&
  (cvIds.has(edge.source) || cvIds.has(edge.target));

export const projectUnitOverviewDiagram = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const unitIds = new Set(nodes.filter(isUnit).map((node) => node.id));
  const withoutUnitNodes = nodes.filter((node) => !unitIds.has(node.id));
  const withoutUnitEdges = edges.filter(
    (edge) =>
      !unitIds.has(edge.source) &&
      !unitIds.has(edge.target) &&
      edge.relationshipType !== 'DEPENDS_ON',
  );
  const cvToComponent = parentByVersionId(
    withoutUnitNodes,
    withoutUnitEdges,
    isComponent,
    isComponentVersion,
  );
  const fvToFeature = parentByVersionId(
    withoutUnitNodes,
    withoutUnitEdges,
    isFeature,
    isFeatureVersion,
  );
  const cvIds = new Set(cvToComponent.keys());
  const nextNodes = withoutUnitNodes.filter((node) => !cvIds.has(node.id));
  const remapped = withoutUnitEdges
    .filter((edge) => !isComponentVersionLink(edge, cvIds))
    .map((edge) => {
      const remappedEnds = remapEdgeEnds(edge, cvToComponent, fvToFeature);
      if (edge.relationshipType !== 'USES_COMPONENT_VERSION') return remappedEnds;
      return toUsesEdge(remappedEnds);
    })
    .filter((edge) => edge.source !== edge.target);
  const usesByKey = new Map<string, ViewEdge>();
  const otherEdges: ViewEdge[] = [];
  for (const edge of remapped) {
    if (edge.relationshipType !== 'USES_COMPONENT_VERSION') {
      otherEdges.push(edge);
      continue;
    }
    const key = usesEdgeKey(edge);
    if (!usesByKey.has(key)) usesByKey.set(key, { ...edge, id: `uses::${key}` });
  }
  return { nodes: [...nextNodes], edges: [...otherEdges, ...usesByKey.values()] };
};
