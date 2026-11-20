import type { ViewEdge } from '@stellode/models';
import type { ApplicationGrouping, ApplicationMemberships } from './application-grouping-types';
import { applicationCopyNodeId } from './application-copy-node-id';

const versionLinkTypes: readonly string[] = ['HAS_VERSION', 'HAS_DRAFT'];

const isStructuralEdge = (edge: ViewEdge, grouping: ApplicationGrouping): boolean => {
  if (edge.relationshipType === 'HAS_COMPONENT') {
    return (
      grouping.membershipsByChild.has(edge.source) || grouping.membershipsByChild.has(edge.target)
    );
  }
  return (
    versionLinkTypes.includes(edge.relationshipType) &&
    (grouping.collapsedVersionToApplication.has(edge.source) ||
      grouping.collapsedVersionToApplication.has(edge.target))
  );
};

const collapsedEndpoint = (id: string, grouping: ApplicationGrouping): string =>
  grouping.collapsedVersionToApplication.get(id) ?? id;

const copyIdsFor = (sourceId: string, memberships: ApplicationMemberships): string[] =>
  [...memberships.keys()].map((applicationId) => applicationCopyNodeId(applicationId, sourceId));

const endpointVariants = (
  id: string,
  grouping: ApplicationGrouping,
  preferredApplicationId: string | undefined,
): string[] => {
  const memberships = grouping.membershipsByChild.get(id);
  if (memberships === undefined) return [id];
  if (preferredApplicationId !== undefined && memberships.has(preferredApplicationId)) {
    return [applicationCopyNodeId(preferredApplicationId, id)];
  }
  return copyIdsFor(id, memberships);
};

const preferredApplicationOf = (edge: ViewEdge): string | undefined =>
  edge.relationshipType === 'USES_COMPONENT_VERSION' ? edge.applicationId : undefined;

const expandEdge = (edge: ViewEdge, grouping: ApplicationGrouping): ViewEdge[] => {
  const preferred = preferredApplicationOf(edge);
  const sources = endpointVariants(collapsedEndpoint(edge.source, grouping), grouping, preferred);
  const targets = endpointVariants(collapsedEndpoint(edge.target, grouping), grouping, preferred);
  return sources.flatMap((source) => targets.map((target) => rerouted(edge, source, target)));
};

const rerouted = (edge: ViewEdge, source: string, target: string): ViewEdge => {
  if (source === edge.source && target === edge.target) return edge;
  return { ...edge, id: `${edge.id}::${source}>${target}`, source, target };
};

export const buildGroupedEdges = (edges: readonly ViewEdge[], grouping: ApplicationGrouping): ViewEdge[] =>
  edges
    .filter((edge) => !isStructuralEdge(edge, grouping))
    .flatMap((edge) => expandEdge(edge, grouping))
    .filter((edge) => edge.source !== edge.target);
