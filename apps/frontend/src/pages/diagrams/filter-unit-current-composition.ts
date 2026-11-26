import { VersionStatus, type ViewEdge, type ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

type TypeById = ReadonlyMap<string, string>;

type CurrentComposition = {
  readonly applicationIds: ReadonlySet<string>;
  readonly componentIds: ReadonlySet<string>;
  readonly applicationVersionIds: ReadonlySet<string>;
};

const nodeTypeKey = (node: ViewNode): string => normalizeDiagramNodeTypeKey(node.data.type);

const typeById = (nodes: readonly ViewNode[]): TypeById =>
  new Map(nodes.map((node) => [node.id, nodeTypeKey(node)] as const));

const isApplicationType = (type: string | undefined): boolean =>
  type === 'app' || type === 'application';

const isProdHasComponentStatus = (status: string | undefined): boolean =>
  status === VersionStatus.Active || status === VersionStatus.Deprecated;

const versionToApplication = (
  edges: readonly ViewEdge[],
  types: TypeById,
): ReadonlyMap<string, string> => {
  const pairs: Array<readonly [string, string]> = [];
  for (const edge of edges) {
    if (edge.relationshipType !== 'HAS_VERSION' && edge.relationshipType !== 'HAS_DRAFT') continue;
    const sourceType = types.get(edge.source);
    const targetType = types.get(edge.target);
    if (isApplicationType(sourceType) && targetType === 'applicationVersion') {
      pairs.push([edge.target, edge.source]);
    }
    if (isApplicationType(targetType) && sourceType === 'applicationVersion') {
      pairs.push([edge.source, edge.target]);
    }
  }
  return new Map(pairs);
};

const currentApplicationVersionIds = (nodes: readonly ViewNode[]): ReadonlySet<string> =>
  new Set(
    nodes
      .filter((node) => nodeTypeKey(node) === 'applicationVersion')
      .filter((node) => node.data.status === 'current')
      .map((node) => node.id),
  );

const componentEndOfHasComponent = (
  edge: ViewEdge,
  types: TypeById,
  currentAvIds: ReadonlySet<string>,
): string | undefined => {
  if (edge.relationshipType !== 'HAS_COMPONENT') return undefined;
  if (!isProdHasComponentStatus(edge.status)) return undefined;
  if (currentAvIds.has(edge.source) && isComponentLikeType(types.get(edge.target))) {
    return edge.target;
  }
  if (currentAvIds.has(edge.target) && isComponentLikeType(types.get(edge.source))) {
    return edge.source;
  }
  return undefined;
};

const applicationVersionEndOfHasComponent = (
  edge: ViewEdge,
  currentAvIds: ReadonlySet<string>,
): string | undefined => {
  if (currentAvIds.has(edge.source)) return edge.source;
  if (currentAvIds.has(edge.target)) return edge.target;
  return undefined;
};

const collectCurrentComposition = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): CurrentComposition => {
  const types = typeById(nodes);
  const avToApp = versionToApplication(edges, types);
  const currentAvIds = currentApplicationVersionIds(nodes);
  const applicationIds = new Set<string>();
  const componentIds = new Set<string>();
  const applicationVersionIds = new Set<string>();
  for (const edge of edges) {
    const componentId = componentEndOfHasComponent(edge, types, currentAvIds);
    if (componentId === undefined) continue;
    const avId = applicationVersionEndOfHasComponent(edge, currentAvIds);
    if (avId === undefined) continue;
    const applicationId = avToApp.get(avId);
    if (applicationId === undefined) continue;
    applicationIds.add(applicationId);
    componentIds.add(componentId);
    applicationVersionIds.add(avId);
  }
  return { applicationIds, componentIds, applicationVersionIds };
};

const keepNode = (node: ViewNode, composition: CurrentComposition): boolean => {
  const type = nodeTypeKey(node);
  if (isComponentLikeType(type)) return composition.componentIds.has(node.id);
  if (isApplicationType(type)) return composition.applicationIds.has(node.id);
  if (type === 'applicationVersion') return composition.applicationVersionIds.has(node.id);
  return true;
};

const edgesAmongNodes = (
  edges: readonly ViewEdge[],
  ids: ReadonlySet<string>,
): ViewEdge[] => edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));

export const filterUnitCurrentComposition = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  const composition = collectCurrentComposition(nodes, edges);
  const nextNodes = nodes.filter((node) => keepNode(node, composition));
  const ids = new Set(nextNodes.map((node) => node.id));
  return { nodes: nextNodes, edges: edgesAmongNodes(edges, ids) };
};
