import { type CSSProperties } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { applyPathOffsetToEndpoints } from './apply-path-offset-to-endpoints';
import { pathOffsetFromEdgeData } from './path-offset-from-edge-data';
import './DependsOnEdge.css';

type DependsOnEdgeLabelPositionVars = {
  readonly '--depends-on-edge-label-x': string;
  readonly '--depends-on-edge-label-y': string;
};

const buildDependsOnEdgeLabelPositionStyle = (
  labelX: number,
  labelY: number,
): DependsOnEdgeLabelPositionVars => ({
  '--depends-on-edge-label-x': `${labelX}px`,
  '--depends-on-edge-label-y': `${labelY}px`,
});

export function DependsOnEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const shifted = applyPathOffsetToEndpoints(
    { sourceX, sourceY, targetX, targetY },
    pathOffsetFromEdgeData(data),
  );
  const [path, labelX, labelY] = getBezierPath({
    ...shifted,
    sourcePosition,
    targetPosition,
  });
  const labelText = typeof label === 'string' ? label : '';
  const labelPositionStyle = buildDependsOnEdgeLabelPositionStyle(
    labelX,
    labelY,
  ) as CSSProperties;
  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={24} />
      {labelText.length > 0 ? (
        <EdgeLabelRenderer>
          <div className="depends-on-edge__label" style={labelPositionStyle}>
            {labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
