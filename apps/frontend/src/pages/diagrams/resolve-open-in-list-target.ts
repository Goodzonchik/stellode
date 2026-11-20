import type { ArchitectureGraph, Node } from '@stellode/models';
import { buildListHighlightSearch } from '../../common/list-highlight/build-list-highlight-search';

const versionLinkTypes = new Set(['HAS_VERSION', 'HAS_DRAFT']);

const parentComponent = (graph: ArchitectureGraph, cvId: string): Node | undefined => {
  const rel = graph.relationships.find(
    (r) => versionLinkTypes.has(r.type) && (r.to === cvId || r.from === cvId),
  );
  if (!rel) return undefined;
  const parentId = rel.to === cvId ? rel.from : rel.to;
  const parent = graph.nodes.find((n) => n.id === parentId);
  return parent?.labels.includes('Component') ? parent : undefined;
};

const listPathForLabels = (
  labels: readonly string[],
): { readonly route: string; readonly useNodeAsUnit?: boolean } | null => {
  if (labels.includes('Unit')) return { route: '/units', useNodeAsUnit: true };
  if (labels.includes('Team')) return { route: '/teams' };
  if (labels.includes('Service')) return { route: '/services' };
  if (labels.includes('Feature')) return { route: '/features' };
  if (labels.includes('Application')) return { route: '/applications' };
  if (labels.includes('Component')) return { route: '/components' };
  return null;
};

const buildPath = (route: string, highlight: string, unitId: string): string => {
  const search = buildListHighlightSearch({ highlight, ctx: { unitId } });
  return `${route}?${search}`;
};

export const resolveOpenInListTarget = (
  graph: ArchitectureGraph,
  nodeId: string,
  currentUnitId: string,
): string | null => {
  const trimmedUnit = currentUnitId.trim();
  if (trimmedUnit === '') return null;
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  if (node.labels.includes('ComponentVersion')) {
    const component = parentComponent(graph, nodeId);
    if (!component) return null;
    const unitId = (component.unitId ?? '').trim();
    if (unitId === '' || unitId !== trimmedUnit) return null;
    return buildPath('/components', component.id, unitId);
  }

  const mapping = listPathForLabels(node.labels);
  if (!mapping) return null;

  if (mapping.useNodeAsUnit === true) {
    if (node.id !== trimmedUnit) return null;
    return buildPath(mapping.route, node.id, node.id);
  }

  const unitId = (node.unitId ?? '').trim();
  if (unitId === '' || unitId !== trimmedUnit) return null;
  return buildPath(mapping.route, node.id, unitId);
};
