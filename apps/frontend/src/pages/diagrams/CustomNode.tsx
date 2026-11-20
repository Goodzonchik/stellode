import { memo, useMemo, type ReactNode } from 'react';
import { Handle, type Node, type NodeProps } from '@xyflow/react';
import { Tooltip } from 'antd';
import type { ViewNode } from '@stellode/models';
import DiagramNodeTypeIcon from './diagram-node-type-icon';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { versionStatusLabelFromRaw } from '../../utils/status-label';
import { captionWithOptionalVersion } from './caption-with-optional-version';
import { toHandlePosition } from './to-handle-position';
import { shouldShowConnectHandles } from './should-show-connect-handles';
import { useNodeHandleVisibility } from './use-node-handle-visibility';
import { DeprecatedWarningTriangle } from '../../components/DeprecatedWarningTriangle';
import { statusWarningTooltipForKind } from '../../components/status-warning-tooltip';
import { useStatusWarning } from '../../context/StatusWarningContext';
import { CrossUnitHintMarker } from './CrossUnitHintMarker';
import { customNodeStatusClass } from './custom-node-status-class';
import {
  shouldShowDeprecatedTriangle,
  statusWarningTriangleKind,
} from './should-show-deprecated-triangle';

type CustomNodeData = ViewNode['data'];

type DiagramCustomNode = Node<CustomNodeData, 'custom'>;

const typeTitleRu: Record<string, string> = {
  unit: 'Юнит',
  team: 'Команда',
  service: 'Услуга',
  app: 'Приложение',
  feature: 'Фича',
  component: 'Компонент',
  applicationVersion: 'Версия приложения',
  componentVersion: 'Версия компонента',
  featureVersion: 'Версия фичи',
  dependency: 'Зависимость',
  consumer: 'Потребитель',
};

const humanTypeLabel = (diagramType: string): string => {
  const key = normalizeDiagramNodeTypeKey(diagramType);
  return typeTitleRu[key] ?? diagramType;
};

const toVersionLabel = (value?: string, versionNumber?: number): string =>
  value ?? (versionNumber !== undefined ? String(versionNumber) : '—');

const buildTooltipTitle = (data: CustomNodeData): ReactNode => {
  const lines: ReactNode[] = [
    <p key="type" className="custom-node__tooltip-line">
      <strong>{humanTypeLabel(data.type)}</strong>
    </p>,
    <p key="name" className="custom-node__tooltip-line">
      {data.label}
    </p>,
  ];
  if (data.status !== undefined) {
    lines.push(
      <p key="status" className="custom-node__tooltip-line">
        {`Статус: ${versionStatusLabelFromRaw(data.status)}`}
      </p>,
    );
  }
  if (data.applicationStatus !== undefined) {
    const appStatus =
      data.applicationStatus === 'active'
        ? 'Активен'
        : data.applicationStatus === 'deprecated'
          ? 'Устарел'
          : data.applicationStatus;
    lines.push(
      <p key="app-status" className="custom-node__tooltip-line">
        {`В приложении: ${appStatus}`}
      </p>,
    );
  }
  if (data.isDependency === true) {
    lines.push(
      <p key="dep" className="custom-node__tooltip-line">
        Зависимость
      </p>,
    );
  }
  const showVersion =
    data.actualVersion !== undefined || data.actualVersionNumber !== undefined;
  if (showVersion) {
    lines.push(
      <p key="ver" className="custom-node__tooltip-line">
        {`actual: ${toVersionLabel(data.actualVersion, data.actualVersionNumber)} | draft: ${toVersionLabel(data.draftVersion, data.draftVersionNumber)}`}
      </p>,
    );
  }
  return <div>{lines}</div>;
};

export default memo(
  ({
    id,
    data,
    isConnectable,
    targetPosition,
    sourcePosition,
  }: NodeProps<DiagramCustomNode>) => {
    const { openForComponentVersion } = useStatusWarning();
    const warningKind = statusWarningTriangleKind(data);
    const componentVersionId = data.sourceId ?? id;
    const [hasIncoming, hasOutgoing] = useNodeHandleVisibility(id);
    const [showTarget, showSource] = shouldShowConnectHandles(
      isConnectable,
      hasIncoming,
      hasOutgoing,
    );
    const captionText = useMemo(() => captionWithOptionalVersion(data), [
      data.label,
      data.actualVersion,
      data.actualVersionNumber,
      data.draftVersion,
      data.draftVersionNumber,
    ]);
    const tooltipTitle = useMemo(
      () => buildTooltipTitle(data),
      [
        data.label,
        data.type,
        data.status,
        data.applicationStatus,
        data.duplicate,
        data.isDependency,
        data.actualVersion,
        data.actualVersionNumber,
        data.draftVersion,
        data.draftVersionNumber,
      ],
    );
    const typeKey = normalizeDiagramNodeTypeKey(data.type);
    const hasDiff = data.diffStatus === 'added' || data.diffStatus === 'removed';
    const squareDiffClass =
      data.diffStatus === 'added'
        ? 'custom-node__square--diff-added'
        : data.diffStatus === 'removed'
          ? 'custom-node__square--diff-removed'
          : '';
    const squareClass = [
      'custom-node__square',
      `custom-node--${typeKey}`,
      squareDiffClass,
      hasDiff ? '' : customNodeStatusClass(data.status, data.applicationStatus),
    ]
      .filter(Boolean)
      .join(' ');
    const impactClass = data.impactHighlighted ? 'custom-node--impact' : '';
    const hoverClass = data.hoverHighlighted ? 'custom-node--hover' : '';
    const diffClass =
      data.diffStatus === 'added'
        ? 'custom-node--diff-added'
        : data.diffStatus === 'removed'
          ? 'custom-node--diff-removed'
          : '';
    const wrapperClass = ['custom-node', impactClass, hoverClass, diffClass]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClass}>
        <Tooltip mouseEnterDelay={0.25} title={tooltipTitle}>
          <div>
            <div className={squareClass}>
              {data.duplicate === true ? (
                <span className="custom-node__duplicate-label">duplicate</span>
              ) : null}
              {data.crossUnitHint !== undefined ? (
                <CrossUnitHintMarker
                  hint={data.crossUnitHint}
                  className={
                    shouldShowDeprecatedTriangle(data)
                      ? 'cross-unit-hint-marker--with-deprecated'
                      : undefined
                  }
                />
              ) : null}
              {warningKind !== null ? (
                <DeprecatedWarningTriangle
                  className="deprecated-warning-triangle--node"
                  title={statusWarningTooltipForKind(warningKind)}
                  onClick={() => openForComponentVersion(componentVersionId)}
                />
              ) : null}
              {showTarget ? (
                <Handle
                  type="target"
                  position={toHandlePosition(targetPosition)}
                  isConnectable={isConnectable}
                />
              ) : null}
              <DiagramNodeTypeIcon diagramType={data.type} />
              {showSource ? (
                <Handle
                  type="source"
                  position={toHandlePosition(sourcePosition)}
                  isConnectable={isConnectable}
                />
              ) : null}
            </div>
            <div className="custom-node__caption">{captionText}</div>
          </div>
        </Tooltip>
      </div>
    );
  },
);
