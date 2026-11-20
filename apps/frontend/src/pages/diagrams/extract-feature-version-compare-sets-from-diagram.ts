import type { ViewEdge, ViewNode } from '@stellode/models';
import { coerceDiagramId } from './coerce-diagram-id';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import {
  compositionCompareKey,
  dependsOnCompareKey,
  type FeatureVersionCompareSets,
} from './feature-version-compare-sets';

const nodeIdsByType = (nodes: readonly ViewNode[], typeKey: string): Set<string> => {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (normalizeDiagramNodeTypeKey(node.data.type) === typeKey) {
      ids.add(node.id);
    }
  }
  return ids;
};

const typeById = (nodes: readonly ViewNode[]): ReadonlyMap<string, string> =>
  new Map(
    nodes.map((node) => [node.id, normalizeDiagramNodeTypeKey(node.data.type)] as const),
  );

const isComponentEndpoint = (typeKey: string | undefined): boolean =>
  typeKey === 'component' ||
  typeKey === 'dependency' ||
  typeKey === 'componentVersion';

const usesComponentVersionId = (
  edge: ViewEdge,
  types: ReadonlyMap<string, string>,
): string | undefined => {
  if (isComponentEndpoint(types.get(edge.target))) return coerceDiagramId(edge.target);
  if (isComponentEndpoint(types.get(edge.source))) return coerceDiagramId(edge.source);
  return coerceDiagramId(edge.target);
};

export const extractFeatureVersionCompareSetsFromDiagram = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
): FeatureVersionCompareSets => {
  const composition = new Set<string>();
  const dependsOn = new Set<string>();
  const types = typeById(nodes);
  for (const edge of edges) {
    if (edge.relationshipType === 'USES_COMPONENT_VERSION') {
      const applicationId = coerceDiagramId(edge.applicationId);
      const componentVersionId = usesComponentVersionId(edge, types);
      if (applicationId !== undefined && componentVersionId !== undefined) {
        composition.add(compositionCompareKey(componentVersionId, applicationId));
      }
      continue;
    }
    if (edge.relationshipType === 'DEPENDS_ON') {
      const sourceId = coerceDiagramId(edge.source);
      const targetId = coerceDiagramId(edge.target);
      if (sourceId !== undefined && targetId !== undefined) {
        dependsOn.add(dependsOnCompareKey(sourceId, targetId));
      }
    }
  }
  return {
    composition,
    dependsOn,
    applications: nodeIdsByType(nodes, 'app'),
    units: nodeIdsByType(nodes, 'unit'),
  };
};
