import ELK from 'elkjs/lib/elk.bundled.js';
import type { ViewEdge, ViewNode } from '@stellode/models';
import { applyElkLayout } from './apply-elk-layout';
import { buildElkGraph } from './build-elk-graph';
import type { LayoutDirection } from './layout-direction';
import type { LayoutedViewNode } from './layouted-view-node';

const elk = new ELK();

export const getLayoutedElements = async (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  direction: LayoutDirection = 'TB',
): Promise<{ nodes: LayoutedViewNode[]; edges: ViewEdge[] }> => {
  const layouted = await elk.layout(buildElkGraph(nodes, edges, direction));
  return { nodes: applyElkLayout(nodes, layouted, direction), edges: [...edges] };
};
