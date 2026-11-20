import type { Position } from '@xyflow/react';
import type { ViewNode } from '@stellode/models';

export type LayoutedViewNode = ViewNode & {
  sourcePosition: Position;
  targetPosition: Position;
};
