import type { CrossUnitHintValue, ViewEdge, ViewNode } from '@stellode/models';
import { groupNodeCaption } from './group-node-caption';
import { isComponentLikeType } from './is-component-like-type';
import { isFlatFeatureVersionComponentNode } from './is-flat-feature-version-component-node';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const emptyCell = '—';

export type FeatureVersionTableRow = {
  readonly key: string;
  readonly componentVersionId: string;
  readonly applicationId: string;
  readonly componentName: string;
  readonly version: string;
  readonly teamLabel: string;
  readonly diffStatus?: 'added' | 'removed';
  readonly flat: boolean;
};

export type FeatureVersionTableGroup = {
  readonly applicationId: string;
  readonly title: string;
  readonly rows: readonly FeatureVersionTableRow[];
};

export type FeatureVersionForeignBlock = {
  readonly key: string;
  readonly unitName: string;
  readonly serviceName: string;
  readonly featureName: string;
  readonly groups: readonly FeatureVersionTableGroup[];
};

export type FeatureVersionCompositionTable = {
  readonly ownGroups: readonly FeatureVersionTableGroup[];
  readonly foreignBlocks: readonly FeatureVersionForeignBlock[];
};

export type BuildFeatureVersionCompositionTableInput = {
  readonly nodes: readonly ViewNode[];
  readonly edges: readonly ViewEdge[];
  readonly homeUnitId?: string;
  readonly crossUnitLinksVisible: boolean;
  readonly namesById?: ReadonlyMap<string, string>;
};

const isComponentNode = (node: ViewNode): boolean =>
  isComponentLikeType(normalizeDiagramNodeTypeKey(node.data.type));

const versionText = (node: ViewNode): string => {
  const version = node.data.actualVersion ?? node.data.draftVersion;
  if (version === undefined) return emptyCell;
  const trimmed = version.trim();
  return trimmed.length > 0 ? trimmed : emptyCell;
};

const hintText = (value: CrossUnitHintValue | undefined): string => {
  if (value === undefined) return emptyCell;
  const list = typeof value === 'string' ? [value] : [...value];
  const unique = [...new Set(list.map((item) => item.trim()).filter((item) => item.length > 0 && item !== emptyCell))];
  return unique.length === 0 ? emptyCell : unique.join(', ');
};

const named = (
  input: BuildFeatureVersionCompositionTableInput,
  id: string | undefined,
): string | undefined => {
  if (id === undefined || id.length === 0) return undefined;
  const fromMap = input.namesById?.get(id)?.trim();
  if (fromMap !== undefined && fromMap.length > 0) return fromMap;
  const node = input.nodes.find((item) => item.id === id);
  const label = node?.data.label.trim();
  return label !== undefined && label.length > 0 ? label : undefined;
};

const teamNamesFor = (
  input: BuildFeatureVersionCompositionTableInput,
  node: ViewNode,
): readonly string[] => {
  const ids = new Set<string>([node.id]);
  if (typeof node.data.sourceId === 'string' && node.data.sourceId.length > 0) {
    ids.add(node.data.sourceId);
  }
  const names: string[] = [];
  for (const edge of input.edges) {
    if (edge.relationshipType !== 'MAINTAINS') continue;
    const teamId = ids.has(edge.target) ? edge.source : ids.has(edge.source) ? edge.target : undefined;
    if (teamId === undefined) continue;
    const label = named(input, teamId);
    if (label !== undefined) names.push(label);
  }
  if (names.length > 0) return names;
  return [];
};

const teamLabelFor = (
  input: BuildFeatureVersionCompositionTableInput,
  node: ViewNode,
): string => {
  const fromEdges = [...new Set(teamNamesFor(input, node))];
  if (fromEdges.length > 0) return fromEdges.join(', ');
  return hintText(node.data.crossUnitHint?.teamName);
};

const applicationIdOf = (node: ViewNode): string =>
  node.data.applicationId ?? node.parentId ?? '';

const toRow = (
  input: BuildFeatureVersionCompositionTableInput,
  node: ViewNode,
): FeatureVersionTableRow => {
  const applicationId = applicationIdOf(node);
  const componentVersionId = node.data.sourceId ?? node.id;
  return {
    key: `${applicationId}::${componentVersionId}`,
    componentVersionId,
    applicationId,
    componentName: node.data.label.trim().length > 0 ? node.data.label.trim() : emptyCell,
    version: versionText(node),
    teamLabel: teamLabelFor(input, node),
    ...(node.data.diffStatus !== undefined ? { diffStatus: node.data.diffStatus } : {}),
    flat: isFlatFeatureVersionComponentNode(node),
  };
};

const isForeign = (
  input: BuildFeatureVersionCompositionTableInput,
  node: ViewNode,
): boolean => {
  const unitId = node.data.unitId;
  if (input.homeUnitId === undefined || unitId === undefined || unitId.length === 0) return false;
  return unitId !== input.homeUnitId;
};

const groupRows = (
  input: BuildFeatureVersionCompositionTableInput,
  rows: readonly FeatureVersionTableRow[],
): FeatureVersionTableGroup[] => {
  const groups: FeatureVersionTableGroup[] = [];
  for (const row of rows) {
    const existing = groups.find((group) => group.applicationId === row.applicationId);
    if (existing !== undefined) {
      groups[groups.indexOf(existing)] = { ...existing, rows: [...existing.rows, row] };
      continue;
    }
    const application = input.nodes.find((node) => node.id === row.applicationId);
    groups.push({
      applicationId: row.applicationId,
      title: application === undefined ? emptyCell : groupNodeCaption(application.data),
      rows: [row],
    });
  }
  return groups;
};

const pairOf = (
  input: BuildFeatureVersionCompositionTableInput,
  node: ViewNode,
): { serviceId: string; featureId: string; serviceName: string; featureName: string } => {
  const edge = input.edges.find(
    (item) =>
      item.relationshipType === 'DEPENDS_ON' &&
      (item.source === node.id || item.target === node.id) &&
      (item.providerServiceId !== undefined || item.providerFeatureId !== undefined),
  );
  const serviceId = edge?.providerServiceId ?? '';
  const featureId = edge?.providerFeatureId ?? '';
  const serviceName =
    named(input, serviceId) ?? hintText(node.data.crossUnitHint?.serviceName);
  const featureName =
    named(input, featureId) ?? hintText(node.data.crossUnitHint?.featureName);
  return { serviceId, featureId, serviceName, featureName };
};

const unitNameOf = (
  input: BuildFeatureVersionCompositionTableInput,
  node: ViewNode,
): string =>
  named(input, node.data.unitId) ?? hintText(node.data.crossUnitHint?.unitName);

const foreignBlocks = (
  input: BuildFeatureVersionCompositionTableInput,
  nodes: readonly ViewNode[],
): FeatureVersionForeignBlock[] => {
  const blocks: FeatureVersionForeignBlock[] = [];
  for (const node of nodes) {
    const pair = pairOf(input, node);
    const unitId = node.data.unitId ?? '';
    const key = `${unitId}::${pair.serviceId}::${pair.featureId}::${pair.serviceName}::${pair.featureName}`;
    const row = toRow(input, node);
    const existing = blocks.find((block) => block.key === key);
    if (existing === undefined) {
      blocks.push({
        key,
        unitName: unitNameOf(input, node),
        serviceName: pair.serviceName,
        featureName: pair.featureName,
        groups: groupRows(input, [row]),
      });
      continue;
    }
    const groups = groupRows(input, [...existing.groups.flatMap((group) => group.rows), row]);
    blocks[blocks.indexOf(existing)] = { ...existing, groups };
  }
  return blocks;
};

export const buildFeatureVersionCompositionTable = (
  input: BuildFeatureVersionCompositionTableInput,
): FeatureVersionCompositionTable => {
  const components = input.nodes.filter(isComponentNode);
  const own = components.filter((node) => !isForeign(input, node));
  const foreign = input.crossUnitLinksVisible
    ? components.filter((node) => isForeign(input, node))
    : [];
  return {
    ownGroups: groupRows(input, own.map((node) => toRow(input, node))),
    foreignBlocks: foreignBlocks(input, foreign),
  };
};
