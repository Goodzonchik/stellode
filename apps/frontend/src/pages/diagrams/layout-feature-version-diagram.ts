import type { ViewEdge, ViewNode } from '@stellode/models';
import { annotateFeatureVersionCrossUnitHints } from './annotate-feature-version-cross-unit-hints';
import { applyFeatureVersionDiagramVisibility } from './feature-version-diagram-type-visibility';
import { groupNodesByApplication } from './group-nodes-by-application';
import { getLayoutedElements } from './layout-diagram';
import type { LayoutDirection } from './layout-direction';

const withoutHidden = <T extends { hidden?: boolean }>(items: readonly T[]): T[] =>
  items
    .filter((item) => !item.hidden)
    .map((item) => {
      const { hidden, ...rest } = item;
      void hidden;
      return rest as T;
    });

export const layoutFeatureVersionDiagram = async (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  direction: LayoutDirection,
  teamsVisible = true,
  crossUnitLinksVisible = false,
  featureVersionIds: readonly string[] = [],
): Promise<{ nodes: ViewNode[]; edges: ViewEdge[] }> => {
  const grouped = groupNodesByApplication(nodes, edges);
  const withHints = annotateFeatureVersionCrossUnitHints(
    grouped.nodes,
    grouped.edges,
    crossUnitLinksVisible,
    featureVersionIds,
  );
  const marked = applyFeatureVersionDiagramVisibility(withHints, grouped.edges, {
    teamsVisible,
    crossUnitLinksVisible,
    featureVersionIds,
  });
  return getLayoutedElements(withoutHidden(marked.nodes), withoutHidden(marked.edges), direction);
};
