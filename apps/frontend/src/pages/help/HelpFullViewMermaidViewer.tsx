import { useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from 'antd';
import {
  CompressOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { HELP_FULL_VIEW_SCALE_STEP } from './clamp-help-full-view-scale';
import { buildHelpFullViewFitTransform } from './build-help-full-view-fit-transform';
import {
  HELP_FULL_VIEW_DEFAULT_TRANSFORM,
  type HelpFullViewTransform,
} from './help-full-view-transform';
import { panHelpFullViewTransform } from './pan-help-full-view-transform';
import { readHelpFullViewSvgSize } from './read-help-full-view-svg-size';
import { zoomHelpFullViewTransform } from './zoom-help-full-view-transform';

type HelpFullViewMermaidViewerProps = {
  readonly svgHtml: string;
};

const resolveFitTransform = (
  stage: HTMLDivElement,
  canvas: HTMLDivElement,
): HelpFullViewTransform => {
  const svg = canvas.querySelector('svg');
  if (svg === null) {
    return HELP_FULL_VIEW_DEFAULT_TRANSFORM;
  }
  const size = readHelpFullViewSvgSize(svg);
  if (size === null) {
    return HELP_FULL_VIEW_DEFAULT_TRANSFORM;
  }
  const rect = stage.getBoundingClientRect();
  return buildHelpFullViewFitTransform(rect.width, rect.height, size.width, size.height);
};

export const HelpFullViewMermaidViewer = ({
  svgHtml,
}: HelpFullViewMermaidViewerProps) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{
    readonly pointerId: number;
    readonly x: number;
    readonly y: number;
    readonly transform: HelpFullViewTransform;
  } | null>(null);
  const [transform, setTransform] = useState<HelpFullViewTransform>(
    HELP_FULL_VIEW_DEFAULT_TRANSFORM,
  );
  const [isDragging, setIsDragging] = useState(false);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (stage === null || canvas === null) {
      return;
    }
    setTransform(resolveFitTransform(stage, canvas));
  }, [svgHtml]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (stage === null) {
      return;
    }
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const delta =
        event.deltaY < 0 ? HELP_FULL_VIEW_SCALE_STEP : -HELP_FULL_VIEW_SCALE_STEP;
      setTransform((current) =>
        zoomHelpFullViewTransform(
          current,
          current.scale + delta,
          event.clientX - rect.left,
          event.clientY - rect.top,
        ),
      );
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [svgHtml]);

  const zoomBy = (delta: number): void => {
    const stage = stageRef.current;
    if (stage === null) {
      setTransform((current) =>
        zoomHelpFullViewTransform(current, current.scale + delta, 0, 0),
      );
      return;
    }
    const rect = stage.getBoundingClientRect();
    setTransform((current) =>
      zoomHelpFullViewTransform(
        current,
        current.scale + delta,
        rect.width / 2,
        rect.height / 2,
      ),
    );
  };

  const fitToView = (): void => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (stage === null || canvas === null) {
      setTransform(HELP_FULL_VIEW_DEFAULT_TRANSFORM);
      return;
    }
    setTransform(resolveFitTransform(stage, canvas));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) {
      return;
    }
    dragOriginRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      transform,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragOriginRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    setTransform(
      panHelpFullViewTransform(
        drag.transform,
        event.clientX - drag.x,
        event.clientY - drag.y,
      ),
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (dragOriginRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragOriginRef.current = null;
    setIsDragging(false);
  };

  const stageClassName = isDragging
    ? 'help-full-view__stage help-full-view__stage--dragging'
    : 'help-full-view__stage';

  return (
    <div className="help-full-view__mermaid">
      <div
        className={stageClassName}
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="help-full-view__canvas"
          ref={canvasRef}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>
      <div className="help-full-view__controls" onClick={(event) => event.stopPropagation()}>
        <Button
          htmlType="button"
          icon={<ZoomInOutlined />}
          aria-label="Увеличить"
          onClick={() => zoomBy(HELP_FULL_VIEW_SCALE_STEP)}
        />
        <Button
          htmlType="button"
          icon={<ZoomOutOutlined />}
          aria-label="Уменьшить"
          onClick={() => zoomBy(-HELP_FULL_VIEW_SCALE_STEP)}
        />
        <Button
          htmlType="button"
          icon={<CompressOutlined />}
          aria-label="Вписать в экран"
          onClick={fitToView}
        />
        <Button
          htmlType="button"
          icon={<ReloadOutlined />}
          aria-label="Сбросить положение"
          onClick={fitToView}
        />
      </div>
    </div>
  );
};
