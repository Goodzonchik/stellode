import type { CrossUnitHint, CrossUnitHintValue, ViewEdge, ViewNode } from '@stellode/models';
import {
  collectFeatureVersionCompositionNodeIds,
  isFeatureVersionCompositionNode,
} from './collect-feature-version-composition-node-ids';
import { isCrossUnitDependsOnEdge } from './collect-feature-version-remote-node-ids';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { UnitDiagramNodeKind, viewNodeUnitKind } from './unit-diagram-type-visibility';

const dash = '—';

const nodeUnitId = (node: ViewNode): string | undefined => {
  const unitId = node.data.unitId;
  return typeof unitId === 'string' && unitId.length > 0 ? unitId : undefined;
};

const labelOrDash = (node: ViewNode | undefined): string => {
  if (node === undefined) return dash;
  const label = node.data.label.trim();
  return label.length > 0 ? label : dash;
};

const asHintList = (value: CrossUnitHintValue): readonly string[] =>
  typeof value === 'string' ? [value] : value;

const mergeHints = (previous: CrossUnitHint | undefined, next: CrossUnitHint): CrossUnitHint => {
  if (previous === undefined) return next;
  const mergeField = (
    left: CrossUnitHintValue,
    right: CrossUnitHintValue,
  ): CrossUnitHintValue => {
    const merged = [...asHintList(left), ...asHintList(right)].filter((item) => item !== dash);
    const unique = [...new Set(merged)];
    if (unique.length === 0) return dash;
    if (unique.length === 1) return unique[0]!;
    return unique;
  };
  return {
    unitName: mergeField(previous.unitName, next.unitName),
    teamName: mergeField(previous.teamName, next.teamName),
    applicationName: mergeField(previous.applicationName, next.applicationName),
    componentName: mergeField(previous.componentName, next.componentName),
    featureName: mergeField(previous.featureName, next.featureName),
    serviceName: mergeField(previous.serviceName, next.serviceName),
  };
};

const findUnitNode = (
  nodes: readonly ViewNode[],
  unitId: string,
): ViewNode | undefined =>
  nodes.find(
    (node) =>
      viewNodeUnitKind(node) === UnitDiagramNodeKind.Unit && node.id === unitId,
  );

const findTeamForComponent = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  componentNodeId: string,
): ViewNode | undefined => {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  for (const edge of edges) {
    if (edge.relationshipType !== 'MAINTAINS') continue;
    if (edge.target === componentNodeId) return byId.get(edge.source);
    if (edge.source === componentNodeId) return byId.get(edge.target);
  }
  return undefined;
};

const isApplicationNode = (node: ViewNode): boolean => {
  const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
  return typeKey === 'app' || typeKey === 'application';
};

const findApplicationById = (
  byId: ReadonlyMap<string, ViewNode>,
  applicationId: string,
): ViewNode | undefined => {
  const app = byId.get(applicationId);
  return app !== undefined && isApplicationNode(app) ? app : undefined;
};

const remoteIdentityIds = (remoteNode: ViewNode): ReadonlySet<string> => {
  const ids = new Set<string>([remoteNode.id]);
  const sourceId = remoteNode.data.sourceId;
  if (typeof sourceId === 'string' && sourceId.length > 0) ids.add(sourceId);
  return ids;
};

const findApplicationForRemote = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  remoteNode: ViewNode,
  dependsOnEdge: ViewEdge,
): ViewNode | undefined => {
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  if (typeof dependsOnEdge.providerApplicationId === 'string') {
    const fromContext = findApplicationById(byId, dependsOnEdge.providerApplicationId);
    if (fromContext !== undefined) return fromContext;
  }
  if (typeof remoteNode.parentId === 'string' && remoteNode.parentId.length > 0) {
    const parent = findApplicationById(byId, remoteNode.parentId);
    if (parent !== undefined) return parent;
  }
  const applicationId = remoteNode.data.applicationId;
  if (typeof applicationId === 'string' && applicationId.length > 0) {
    const fromData = findApplicationById(byId, applicationId);
    if (fromData !== undefined) return fromData;
  }
  const identities = remoteIdentityIds(remoteNode);
  for (const edge of edges) {
    if (
      edge.relationshipType !== 'USES_COMPONENT_VERSION' &&
      edge.relationshipType !== 'USES'
    ) {
      continue;
    }
    if (typeof edge.applicationId !== 'string' || edge.applicationId.length === 0) continue;
    if (!identities.has(edge.source) && !identities.has(edge.target)) continue;
    const fromUses = findApplicationById(byId, edge.applicationId);
    if (fromUses !== undefined) return fromUses;
  }
  return undefined;
};

const findFeatureNearUnit = (
  nodes: readonly ViewNode[],
  unitId: string,
): ViewNode | undefined =>
  nodes.find((node) => {
    if (viewNodeUnitKind(node) !== UnitDiagramNodeKind.Feature) return false;
    return nodeUnitId(node) === unitId;
  });

const findServiceNearUnit = (
  nodes: readonly ViewNode[],
  unitId: string,
): ViewNode | undefined =>
  nodes.find((node) => {
    if (viewNodeUnitKind(node) !== UnitDiagramNodeKind.Service) return false;
    return nodeUnitId(node) === unitId;
  });

const buildHint = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  remoteNode: ViewNode,
  dependsOnEdge: ViewEdge,
): CrossUnitHint => {
  const unitId = nodeUnitId(remoteNode) ?? '';
  const unitNode = unitId.length > 0 ? findUnitNode(nodes, unitId) : undefined;
  const sourceId =
    typeof remoteNode.data.sourceId === 'string' && remoteNode.data.sourceId.length > 0
      ? remoteNode.data.sourceId
      : remoteNode.id;
  const teamNode =
    findTeamForComponent(nodes, edges, remoteNode.id) ??
    findTeamForComponent(nodes, edges, sourceId);
  const applicationNode = findApplicationForRemote(
    nodes,
    edges,
    remoteNode,
    dependsOnEdge,
  );
  const featureNode = unitId.length > 0 ? findFeatureNearUnit(nodes, unitId) : undefined;
  const serviceNode = unitId.length > 0 ? findServiceNearUnit(nodes, unitId) : undefined;
  return {
    unitName: labelOrDash(unitNode),
    teamName: labelOrDash(teamNode),
    applicationName: labelOrDash(applicationNode),
    componentName: labelOrDash(remoteNode),
    featureName: labelOrDash(featureNode),
    serviceName: labelOrDash(serviceNode),
  };
};

export const annotateFeatureVersionCrossUnitHints = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  crossUnitLinksVisible: boolean,
  featureVersionIds: readonly string[] = [],
): ViewNode[] => {
  const compositionIds = collectFeatureVersionCompositionNodeIds(
    nodes,
    edges,
    featureVersionIds,
  );
  const byId = new Map(nodes.map((node) => [node.id, node] as const));
  const hintByNodeId = new Map<string, CrossUnitHint>();

  for (const edge of edges) {
    if (!isCrossUnitDependsOnEdge(edge, byId, compositionIds)) continue;
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (source === undefined || target === undefined) continue;
    const sourceIsLocal = isFeatureVersionCompositionNode(source, compositionIds);
    const targetIsLocal = isFeatureVersionCompositionNode(target, compositionIds);
    const remote =
      sourceIsLocal && !targetIsLocal
        ? target
        : targetIsLocal && !sourceIsLocal
          ? source
          : target;
    const local = remote.id === target.id ? source : target;
    const hint = buildHint(nodes, edges, remote, edge);
    if (crossUnitLinksVisible) {
      hintByNodeId.set(remote.id, hint);
    } else {
      hintByNodeId.set(local.id, mergeHints(hintByNodeId.get(local.id), hint));
    }
  }

  return nodes.map((node) => {
    const hint = hintByNodeId.get(node.id);
    if (hint === undefined) {
      if (node.data.crossUnitHint === undefined) return node;
      const { crossUnitHint: _removed, ...restData } = node.data;
      void _removed;
      return { ...node, data: restData };
    }
    return { ...node, data: { ...node.data, crossUnitHint: hint } };
  });
};
