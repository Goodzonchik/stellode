import type { ViewNode } from '@stellode/models';
import type { ApplicationGrouping, ApplicationMemberships } from './application-grouping-types';
import { applicationCopyNodeId } from './application-copy-node-id';
import { collectApplicationIdsWithDependency } from './collect-application-ids-with-dependency';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const containerIds = (grouping: ApplicationGrouping): ReadonlySet<string> =>
  new Set([...grouping.membershipsByChild.values()].flatMap((memberships) => [...memberships.keys()]));

const isApplicationVersionNode = (node: ViewNode): boolean =>
  normalizeDiagramNodeTypeKey(node.data.type) === 'applicationVersion';

const versionNodeByApplication = (
  nodes: readonly ViewNode[],
  grouping: ApplicationGrouping,
): ReadonlyMap<string, ViewNode> =>
  new Map(
    nodes
      .filter((node) => grouping.collapsedVersionToApplication.has(node.id))
      .map((node) => [grouping.collapsedVersionToApplication.get(node.id) ?? '', node] as const),
  );

const withCollapsedVersion = (container: ViewNode, version: ViewNode | undefined): ViewNode => {
  if (version === undefined) return container;
  return {
    ...container,
    data: {
      ...container.data,
      actualVersion:
        container.data.actualVersion ??
        version.data.actualVersion ??
        version.data.draftVersion,
      actualVersionNumber:
        container.data.actualVersionNumber ??
        version.data.actualVersionNumber ??
        version.data.draftVersionNumber,
    },
  };
};

const toGroupNode = (node: ViewNode, containsDependency: boolean): ViewNode => ({
  ...node,
  type: 'group',
  data: containsDependency ? { ...node.data, containsDependency: true } : node.data,
});

const toCopy = (
  child: ViewNode,
  applicationId: string,
  applicationStatus: string | undefined,
  duplicate: boolean,
): ViewNode => ({
  ...child,
  id: applicationCopyNodeId(applicationId, child.id),
  parentId: applicationId,
  extent: 'parent',
  data: {
    ...child.data,
    sourceId: child.id,
    applicationId,
    ...(applicationStatus !== undefined ? { applicationStatus } : {}),
    ...(duplicate ? { duplicate: true } : {}),
  },
});

const copiesOf = (child: ViewNode, memberships: ApplicationMemberships): ViewNode[] => {
  const duplicate = memberships.size > 1;
  return [...memberships.entries()].map(([applicationId, status]) =>
    toCopy(child, applicationId, status, duplicate),
  );
};

const withVersionIfCollapsed = (
  node: ViewNode,
  versions: ReadonlyMap<string, ViewNode>,
): ViewNode => withCollapsedVersion(node, versions.get(node.id));

export const buildGroupedNodes = (nodes: readonly ViewNode[], grouping: ApplicationGrouping): ViewNode[] => {
  const containers = containerIds(grouping);
  const versions = versionNodeByApplication(nodes, grouping);
  const appsWithDependency = collectApplicationIdsWithDependency(nodes, grouping);
  const topLevel = nodes
    .filter((node) => !isApplicationVersionNode(node))
    .filter((node) => !grouping.membershipsByChild.has(node.id))
    .map((node) => {
      const withVersion = withVersionIfCollapsed(node, versions);
      return containers.has(node.id)
        ? toGroupNode(withVersion, appsWithDependency.has(node.id))
        : withVersion;
    });
  const copies = nodes.flatMap((node) => {
    const memberships = grouping.membershipsByChild.get(node.id);
    return memberships === undefined ? [] : copiesOf(node, memberships);
  });
  return [...topLevel, ...copies];
};
