import { Tag } from 'antd';
import { VersionStatus, type VersionStatus as VersionStatusType } from '@stellode/models';
import { versionStatusLabel } from '../utils/status-label';
import { DeprecatedWarningTriangle } from './DeprecatedWarningTriangle';
import { statusWarningTooltipForKind } from './status-warning-tooltip';

const colorByStatus: Record<VersionStatusType, string> = {
  draft: 'default',
  active: 'success',
  deprecated: 'warning',
  unactive: 'default',
};

const warningKindForStatus = (
  status: VersionStatusType,
): 'deprecated' | 'unactive' | null => {
  if (status === VersionStatus.Deprecated) return 'deprecated';
  if (status === VersionStatus.Unactive) return 'unactive';
  return null;
};

export const VersionLifecycleStatusTag = (props: {
  readonly status: VersionStatusType | null;
  readonly onWarningClick?: () => void;
}) => {
  if (props.status === null) {
    return <Tag>-</Tag>;
  }
  const warningKind = warningKindForStatus(props.status);
  return (
    <span className="deprecated-warning-name">
      <Tag color={colorByStatus[props.status]}>{versionStatusLabel(props.status)}</Tag>
      {warningKind !== null && props.onWarningClick !== undefined ? (
        <DeprecatedWarningTriangle
          title={statusWarningTooltipForKind(warningKind)}
          onClick={props.onWarningClick}
        />
      ) : null}
    </span>
  );
};
