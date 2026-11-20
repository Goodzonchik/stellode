import type { ViewEdge, ViewNode } from '@stellode/models';
import type { ApplicationGrouping, ApplicationMemberships } from './application-grouping-types';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';

type TypeById = ReadonlyMap<string, string>;

const typeById = (nodes: readonly ViewNode[]): TypeById =>
  new Map(nodes.map((node) => [node.id, normalizeDiagramNodeTypeKey(node.data.type)] as const));

const isApplicationType = (type: string | undefined): boolean => type === 'app' || type === 'application';

const isComponentChildType = (type: string | undefined): boolean =>
  isComponentLikeType(type) || type === 'componentVersion';

const versionToApplicationFromEdges = (
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
    } else if (isApplicationType(targetType) && sourceType === 'applicationVersion') {
      pairs.push([edge.source, edge.target]);
    }
  }
  return new Map(pairs);
};

const versionToApplicationFromNodes = (
  nodes: readonly ViewNode[],
  types: TypeById,
): ReadonlyMap<string, string> => {
  const pairs: Array<readonly [string, string]> = [];
  for (const node of nodes) {
    if (normalizeDiagramNodeTypeKey(node.data.type) !== 'applicationVersion') continue;
    const applicationId = node.data.applicationId;
    if (applicationId === undefined || applicationId === '') continue;
    if (!isApplicationType(types.get(applicationId))) continue;
    pairs.push([node.id, applicationId]);
  }
  return new Map(pairs);
};

const versionToApplication = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  types: TypeById,
): ReadonlyMap<string, string> =>
  new Map([...versionToApplicationFromEdges(edges, types), ...versionToApplicationFromNodes(nodes, types)]);

const resolveApplicationContainer = (
  endpointId: string,
  types: TypeById,
  versionToApp: ReadonlyMap<string, string>,
): string | undefined => {
  if (isApplicationType(types.get(endpointId))) return endpointId;
  return versionToApp.get(endpointId);
};

const preferActive = (previous: string | undefined, next: string | undefined): string | undefined =>
  previous === 'active' || next === 'active' ? 'active' : (next ?? previous);

const withMembership = (
  memberships: ReadonlyMap<string, ApplicationMemberships>,
  childId: string,
  applicationId: string,
  status: string | undefined,
): ReadonlyMap<string, ApplicationMemberships> => {
  const current = memberships.get(childId) ?? new Map<string, string | undefined>();
  const nextStatus = preferActive(current.get(applicationId), status);
  const nextMemberships = new Map(current).set(applicationId, nextStatus);
  return new Map(memberships).set(childId, nextMemberships);
};

const componentEndpointId = (edge: ViewEdge, types: TypeById): string | undefined => {
  if (isComponentChildType(types.get(edge.source))) return edge.source;
  if (isComponentChildType(types.get(edge.target))) return edge.target;
  return undefined;
};

const hasComponentEdges = (edges: readonly ViewEdge[]): ViewEdge[] =>
  edges.filter((edge) => edge.relationshipType === 'HAS_COMPONENT');

const usesWithApplicationEdges = (edges: readonly ViewEdge[], types: TypeById): ViewEdge[] =>
  edges
    .filter((edge) => edge.relationshipType === 'USES_COMPONENT_VERSION')
    .filter((edge) => edge.applicationId !== undefined && edge.applicationId !== '')
    .filter((edge) => isApplicationType(types.get(edge.applicationId ?? '')));

const withUsesMemberships = (
  memberships: ReadonlyMap<string, ApplicationMemberships>,
  edges: readonly ViewEdge[],
  types: TypeById,
): ReadonlyMap<string, ApplicationMemberships> =>
  usesWithApplicationEdges(edges, types).reduce((acc, edge) => {
    const childId = componentEndpointId(edge, types);
    if (childId === undefined || !types.has(childId)) return acc;
    return withMembership(acc, childId, edge.applicationId ?? '', undefined);
  }, memberships);

const collapsedVersionsFromLinks = (
  versionToApp: ReadonlyMap<string, string>,
  types: TypeById,
): Map<string, string> => {
  const collapsed = new Map<string, string>();
  for (const [versionId, applicationId] of versionToApp) {
    if (types.has(versionId) && types.has(applicationId)) collapsed.set(versionId, applicationId);
  }
  return collapsed;
};

export const collectApplicationGrouping = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): ApplicationGrouping => {
  const types = typeById(nodes);
  const versionToApp = versionToApplication(nodes, edges, types);
  const collapsedVersions = collapsedVersionsFromLinks(versionToApp, types);
  let membershipsByChild: ReadonlyMap<string, ApplicationMemberships> = new Map();
  for (const edge of hasComponentEdges(edges)) {
    const childId = componentEndpointId(edge, types);
    if (childId === undefined || !types.has(childId)) continue;
    const otherId = edge.source === childId ? edge.target : edge.source;
    const container = resolveApplicationContainer(otherId, types, versionToApp);
    if (container === undefined || !types.has(container)) continue;
    membershipsByChild = withMembership(membershipsByChild, childId, container, edge.status);
  }
  return {
    membershipsByChild: withUsesMemberships(membershipsByChild, edges, types),
    collapsedVersionToApplication: collapsedVersions,
  };
};
