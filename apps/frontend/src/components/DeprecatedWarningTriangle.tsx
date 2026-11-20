import type { MouseEvent } from 'react';
import { WarningFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import './DeprecatedWarningTriangle.css';

export const DeprecatedWarningTriangle = (props: {
  readonly title: string;
  readonly className?: string;
  readonly onClick?: () => void;
}) => {
  const handleClick = (event: MouseEvent<HTMLSpanElement>): void => {
    event.stopPropagation();
    event.preventDefault();
    props.onClick?.();
  };
  return (
    <Tooltip title={props.title}>
      <WarningFilled
        className={[
          'deprecated-warning-triangle',
          props.onClick ? 'deprecated-warning-triangle--clickable' : null,
          props.className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={props.title}
        role={props.onClick ? 'button' : undefined}
        tabIndex={props.onClick ? 0 : undefined}
        onClick={props.onClick ? handleClick : undefined}
        onKeyDown={
          props.onClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  props.onClick?.();
                }
              }
            : undefined
        }
      />
    </Tooltip>
  );
};
