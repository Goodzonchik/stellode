import type { ViewEdge, ViewNode } from '@stellode/models';
import { annotateFeatureVersionCrossUnitHints } from './annotate-feature-version-cross-unit-hints';
import { applyFeatureVersionCompareDiffStatus } from './apply-feature-version-compare-diff-status';
import { applyFeatureVersionDiagramVisibility } from './feature-version-diagram-type-visibility';
import type { FeatureVersionCompareDiff } from './diff-feature-version-compare-sets';
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

export const layoutFeatureVersionCompareDiagram = async (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  direction: LayoutDirection,
  diff: FeatureVersionCompareDiff,
  teamsVisible = true,
  crossUnitLinksVisible = false,
  featureVersionIds: readonly string[] = [],
): Promise<{ nodes: ViewNode[]; edges: ViewEdge[] }> => {
  const grouped = groupNodesByApplication(nodes, edges);
  const marked = applyFeatureVersionCompareDiffStatus(grouped.nodes, grouped.edges, diff);
  const withHints = annotateFeatureVersionCrossUnitHints(
    marked.nodes,
    marked.edges,
    crossUnitLinksVisible,
    featureVersionIds,
  );
  const visible = applyFeatureVersionDiagramVisibility(withHints, marked.edges, {
    teamsVisible,
    crossUnitLinksVisible,
    featureVersionIds,
  });
  return getLayoutedElements(
    withoutHidden(visible.nodes),
    withoutHidden(visible.edges),
    direction,
  );
};
