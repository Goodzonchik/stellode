export type BezierEndpoints = {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
};

export const applyPathOffsetToEndpoints = (
  endpoints: BezierEndpoints,
  pathOffset: number,
): BezierEndpoints => {
  if (pathOffset === 0) return endpoints;
  const dx = endpoints.targetX - endpoints.sourceX;
  const dy = endpoints.targetY - endpoints.sourceY;
  const length = Math.hypot(dx, dy) || 1;
  const ox = (-dy / length) * pathOffset;
  const oy = (dx / length) * pathOffset;
  return {
    sourceX: endpoints.sourceX + ox,
    sourceY: endpoints.sourceY + oy,
    targetX: endpoints.targetX + ox,
    targetY: endpoints.targetY + oy,
  };
};
