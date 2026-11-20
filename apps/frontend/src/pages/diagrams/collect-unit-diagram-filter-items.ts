import type { ViewNode } from '@stellode/models';
import type {
  UnitDiagramFilterCatalog,
  UnitDiagramFilterItem,
  UnitDiagramFilterKind,
} from './unit-diagram-instance-filter-types';
import { UnitDiagramFilterKind as Kind } from './unit-diagram-instance-filter-types';
import { unitDiagramFilterNodeKind } from './unit-diagram-filter-node-kind';

const emptyCatalog = (): {
  -readonly [K in UnitDiagramFilterKind]: UnitDiagramFilterItem[];
} => ({
  [Kind.Team]: [],
  [Kind.Component]: [],
  [Kind.Service]: [],
  [Kind.Feature]: [],
  [Kind.App]: [],
});

const byLabel = (left: UnitDiagramFilterItem, right: UnitDiagramFilterItem): number =>
  left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });

const sortCatalog = (catalog: {
  -readonly [K in UnitDiagramFilterKind]: UnitDiagramFilterItem[];
}): UnitDiagramFilterCatalog => ({
  [Kind.Team]: [...catalog[Kind.Team]].sort(byLabel),
  [Kind.Component]: [...catalog[Kind.Component]].sort(byLabel),
  [Kind.Service]: [...catalog[Kind.Service]].sort(byLabel),
  [Kind.Feature]: [...catalog[Kind.Feature]].sort(byLabel),
  [Kind.App]: [...catalog[Kind.App]].sort(byLabel),
});

export const collectUnitDiagramFilterItems = (
  nodes: readonly ViewNode[],
): UnitDiagramFilterCatalog => {
  const catalog = emptyCatalog();
  const seen = new Set<string>();
  for (const node of nodes) {
    const kind = unitDiagramFilterNodeKind(node);
    if (kind === null) continue;
    const key = `${kind}:${node.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    catalog[kind].push({ id: node.id, label: node.data.label || node.id });
  }
  return sortCatalog(catalog);
};
