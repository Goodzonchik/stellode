import type { ViewNode } from '@stellode/models';
import { diagramViewNodeLayout } from './diagram-view-node-layout';

export type ViewNodeDimensions = {
  width: number;
  height: number;
};

const captionLinesForLabel = (label: string): number => {
  const { captionMaxLines, captionCharsPerLine } = diagramViewNodeLayout;
  const lines = Math.ceil(label.length / captionCharsPerLine);
  return Math.min(captionMaxLines, Math.max(1, lines));
};

export const estimateViewNodeDimensions = (node: ViewNode): ViewNodeDimensions => {
  const lines = captionLinesForLabel(node.data.label);
  const height =
    diagramViewNodeLayout.squarePx +
    diagramViewNodeLayout.gapSquareCaptionPx +
    lines * diagramViewNodeLayout.captionLineHeightPx;
  return {
    width: diagramViewNodeLayout.columnWidthPx,
    height,
  };
};
