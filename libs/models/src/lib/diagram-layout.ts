import type { ArchitectureGraph, ArchitectureRelationship, Label } from './graph';

export type LayerOrder = readonly Label[];

export const DIAGRAM_LAYER_ORDERS = {
  team: [
    'Team',
    'Component',
    'ComponentVersion',
    'FeatureVersion',
    'Feature',
    'Service',
    'Application',
    'ApplicationVersion',
  ],
  unit: [
    'Unit',
    'Team',
    'Component',
    'ComponentVersion',
    'Service',
    'Feature',
    'Application',
    'ApplicationVersion',
  ],
  crossUnit: ['Unit'],
  application: ['Application', 'ApplicationVersion', 'ComponentVersion', 'Component', 'Team'],
  service: ['Unit', 'Service', 'Feature', 'Component'],
  feature: [
    'Unit',
    'Team',
    'Application',
    'ApplicationVersion',
    'Component',
    'ComponentVersion',
    'FeatureVersion',
    'Feature',
    'Service',
  ],
  component: ['Team', 'Component', 'ComponentVersion', 'FeatureVersion'],
} as const satisfies Record<string, LayerOrder>;

const layerIndexForLabels = (labels: readonly Label[], order: LayerOrder): number | undefined => {
  for (let i = 0; i < order.length; i++) {
    if (labels.includes(order[i])) return i;
  }
  return undefined;
};

const orientRelationship = (
  rel: ArchitectureRelationship,
  fromIdx: number | undefined,
  toIdx: number | undefined,
): ArchitectureRelationship => {
  if (fromIdx === undefined || toIdx === undefined) return rel;
  if (fromIdx <= toIdx) return rel;
  return { ...rel, from: rel.to, to: rel.from };
};

const orientSingleRelationship = (
  rel: ArchitectureRelationship,
  idToLabels: ReadonlyMap<string, readonly Label[]>,
  layerOrder: LayerOrder,
): ArchitectureRelationship => {
  const fromLabels = idToLabels.get(rel.from);
  const toLabels = idToLabels.get(rel.to);
  if (!fromLabels || !toLabels) return rel;
  const fromIdx = layerIndexForLabels(fromLabels, layerOrder);
  const toIdx = layerIndexForLabels(toLabels, layerOrder);
  return orientRelationship(rel, fromIdx, toIdx);
};

export const orientGraphByLayerOrder = (
  graph: ArchitectureGraph,
  layerOrder: LayerOrder,
): ArchitectureGraph => {
  const idToLabels = new Map(graph.nodes.map((n) => [n.id, n.labels] as const));
  const relationships = graph.relationships.map((rel) =>
    orientSingleRelationship(rel, idToLabels, layerOrder),
  );
  return { nodes: graph.nodes, relationships };
};
