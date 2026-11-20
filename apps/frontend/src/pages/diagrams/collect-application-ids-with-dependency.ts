import type { ViewNode } from '@stellode/models';
import type { ApplicationGrouping } from './application-grouping-types';

const isDependencyNode = (node: ViewNode): boolean => node.data.type === 'dependency';

export const collectApplicationIdsWithDependency = (
  nodes: readonly ViewNode[],
  grouping: ApplicationGrouping,
): ReadonlySet<string> =>
  new Set(
    nodes.flatMap((node) => {
      if (!isDependencyNode(node)) return [];
      const memberships = grouping.membershipsByChild.get(node.id);
      return memberships === undefined ? [] : [...memberships.keys()];
    }),
  );
