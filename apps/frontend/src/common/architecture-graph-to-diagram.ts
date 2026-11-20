import type {
  ArchitectureGraph,
  ArchitectureRelationship,
  Diagram,
  Node,
  ViewEdge,
  ViewNode,
} from '@stellode/models';
import { parseVersionStatus, VersionStatus } from '@stellode/models';

const stringProperty = (rel: ArchitectureRelationship, key: string): string | undefined => {
  const value = rel.properties?.[key];
  return typeof value === 'string' ? value : undefined;
};

const relationshipToViewEdge = (rel: ArchitectureRelationship): ViewEdge => {
  const applicationId = stringProperty(rel, 'applicationId');
  const status = stringProperty(rel, 'status');
  const consumerApplicationId =
    rel.type === 'DEPENDS_ON' ? stringProperty(rel, 'consumerApplicationId') : undefined;
  const providerApplicationId =
    rel.type === 'DEPENDS_ON' ? stringProperty(rel, 'providerApplicationId') : undefined;
  const providerServiceId =
    rel.type === 'DEPENDS_ON' ? stringProperty(rel, 'providerServiceId') : undefined;
  const providerFeatureId =
    rel.type === 'DEPENDS_ON' ? stringProperty(rel, 'providerFeatureId') : undefined;
  return {
    id: rel.id,
    source: rel.from,
    target: rel.to,
    type: 'default',
    label: rel.type,
    relationshipType: rel.type,
    ...(applicationId !== undefined ? { applicationId } : {}),
    ...(consumerApplicationId !== undefined ? { consumerApplicationId } : {}),
    ...(providerApplicationId !== undefined ? { providerApplicationId } : {}),
    ...(providerServiceId !== undefined ? { providerServiceId } : {}),
    ...(providerFeatureId !== undefined ? { providerFeatureId } : {}),
    ...(status !== undefined ? { status } : {}),
  };
};

const featureVersionDraftReadyMap = (graph: ArchitectureGraph): Map<string, boolean> => {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const usesByFv = new Map<string, string[]>();
  for (const r of graph.relationships) {
    if (r.type !== 'USES_COMPONENT_VERSION') continue;
    const list = usesByFv.get(r.from) ?? [];
    list.push(r.to);
    usesByFv.set(r.from, list);
  }
  const out = new Map<string, boolean>();
  for (const n of graph.nodes) {
    if (!n.labels.includes('FeatureVersion') || n.status !== 'draft') continue;
    const cvIds = usesByFv.get(n.id) ?? [];
    const ready =
      cvIds.length === 0 ||
      cvIds.every((cid) => {
        const cv = nodeById.get(cid);
        const s = parseVersionStatus(cv?.status);
        return s === VersionStatus.Active || s === VersionStatus.Deprecated;
      });
    out.set(n.id, ready);
  }
  return out;
};

const unitIdForViewNode = (node: Node): string | undefined => {
  if (node.labels.includes('Unit')) return node.id;
  return node.unitId;
};

export const graphNodeToViewData = (node: Node): ViewNode['data'] => {
  const unitId = unitIdForViewNode(node);
  return {
    label: node.name,
    type: node.type ?? 'default',
    ...(node.isDependency !== undefined ? { isDependency: node.isDependency } : {}),
    ...(node.actualVersion !== undefined ? { actualVersion: node.actualVersion } : {}),
    ...(node.actualVersionNumber !== undefined
      ? { actualVersionNumber: node.actualVersionNumber }
      : {}),
    ...(node.draftVersion !== undefined ? { draftVersion: node.draftVersion } : {}),
    ...(node.draftVersionNumber !== undefined
      ? { draftVersionNumber: node.draftVersionNumber }
      : {}),
    ...(node.version !== undefined ? { actualVersion: node.version } : {}),
    ...(node.versionNumber !== undefined ? { actualVersionNumber: node.versionNumber } : {}),
    ...(node.status !== undefined ? { status: node.status } : {}),
    ...(unitId !== undefined ? { unitId } : {}),
    ...(node.applicationId !== undefined ? { applicationId: node.applicationId } : {}),
  };
};

const graphNodeToViewNode = (node: Node, fvReady: Map<string, boolean>): ViewNode => {
  const base = graphNodeToViewData(node);
  const isFvDraft = node.labels.includes('FeatureVersion') && node.status === 'draft';
  const data =
    isFvDraft ? { ...base, readyToProduction: fvReady.get(node.id) ?? false } : base;
  return { id: node.id, type: 'custom', draggable: true, position: { x: 0, y: 0 }, data };
};

export function architectureGraphToDiagram(graph: ArchitectureGraph): Diagram {
  const fvReady = featureVersionDraftReadyMap(graph);
  const nodes: ViewNode[] = graph.nodes.map((node) => graphNodeToViewNode(node, fvReady));
  const edges: ViewEdge[] = graph.relationships.map(relationshipToViewEdge);
  return { nodes, edges };
}
