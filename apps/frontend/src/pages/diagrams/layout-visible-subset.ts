import type { LayoutDirection } from './layout-direction';
import { layoutVisibleDiagram } from './layout-visible-diagram';
import type { ApplyVisibility, FlatDiagram, UnitVisibilityState } from './flat-diagram';

export const layoutVisibleSubset = (
  applyVisibility: ApplyVisibility,
  base: FlatDiagram,
  visibility: UnitVisibilityState,
  direction: LayoutDirection,
): Promise<FlatDiagram> => {
  const marked = applyVisibility(base.nodes, base.edges, visibility);
  return layoutVisibleDiagram(marked.nodes, marked.edges, direction);
};
