import { Position } from '@xyflow/react';

export const toHandlePosition = (position: string | undefined): Position => {
  if (position === 'top') return Position.Top;
  if (position === 'bottom') return Position.Bottom;
  if (position === 'right') return Position.Right;
  return Position.Left;
};
