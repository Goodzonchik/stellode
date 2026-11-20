import { memo, type CSSProperties } from 'react';
import { Handle, type Node, type NodeProps } from '@xyflow/react';
import { AppstoreOutlined, BankOutlined } from '@ant-design/icons';
import type { ViewNode } from '@stellode/models';
import { buildGroupNodeClassName } from './build-group-node-class-name';
import { buildGroupNodeUnitAccentStyle } from './build-group-node-unit-accent-style';
import { groupNodeCaption } from './group-node-caption';
import { isGroupNodeUnitType } from './is-group-node-unit-type';
import { toHandlePosition } from './to-handle-position';
import { useNodeHandleVisibility } from './use-node-handle-visibility';
import './GroupNode.css';

type DiagramGroupNode = Node<ViewNode['data'], 'group'>;

export default memo(
  ({ id, data, isConnectable, targetPosition, sourcePosition }: NodeProps<DiagramGroupNode>) => {
    const [hasIncoming, hasOutgoing] = useNodeHandleVisibility(id);
    const caption = groupNodeCaption(data);
    const isUnit = isGroupNodeUnitType(data.type);
    const wrapperClass = buildGroupNodeClassName(data);
    const accentStyle = buildGroupNodeUnitAccentStyle(id, data) as CSSProperties | undefined;
    return (
      <section className={wrapperClass} style={accentStyle} title={caption}>
        {hasIncoming ? (
          <Handle type="target" position={toHandlePosition(targetPosition)} isConnectable={isConnectable} />
        ) : null}

        <header className="group-node__header">
          {isUnit ? (
            <BankOutlined aria-hidden className="group-node__icon" />
          ) : (
            <AppstoreOutlined aria-hidden className="group-node__icon" />
          )}

          <span className="group-node__caption">{caption}</span>
        </header>

        {hasOutgoing ? (
          <Handle type="source" position={toHandlePosition(sourcePosition)} isConnectable={isConnectable} />
        ) : null}
      </section>
    );
  },
);
