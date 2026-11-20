import type { LayoutOptions } from 'elkjs/lib/elk-api';
import { diagramGroupNodeLayout } from './diagram-group-node-layout';
import type { LayoutDirection } from './layout-direction';

const spacing = { nodeNode: 48, betweenLayers: 72, edgeNode: 20, margin: 32 } as const;

const padding = (top: number, side: number): string =>
  `[top=${top},left=${side},bottom=${side},right=${side}]`;

const rootOptions = (direction: LayoutDirection): LayoutOptions => ({
  'elk.algorithm': 'layered',
  'elk.direction': direction === 'LR' ? 'RIGHT' : 'DOWN',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.spacing.nodeNode': String(spacing.nodeNode),
  'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing.betweenLayers),
  'elk.spacing.edgeNode': String(spacing.edgeNode),
  'elk.padding': padding(spacing.margin, spacing.margin),
});

const containerOptions = (): LayoutOptions => ({
  'elk.padding': padding(
    diagramGroupNodeLayout.headerHeightPx + diagramGroupNodeLayout.paddingPx,
    diagramGroupNodeLayout.paddingPx,
  ),
});

export const elkLayoutOptions = {
  root: rootOptions,
  container: containerOptions,
} as const;
