import { Space } from 'antd';
import { VersionStatus, type ApplicationListItem } from '@stellode/models';
import { VersionLifecycleStatusTag } from '../../components/VersionLifecycleStatusTag';
import { formatApplicationListVersion } from './format-application-list-version';

export const ApplicationListVersionCell = (props: {
  readonly row: ApplicationListItem;
}) => {
  const cell = formatApplicationListVersion(props.row.currentVersion, props.row.currentVersionStatus);
  if (cell.kind === 'empty') return <>-</>;
  if (cell.kind === 'current') return <>{cell.version}</>;
  return (
    <Space size="small">
      <span>{cell.version}</span>
      <VersionLifecycleStatusTag status={VersionStatus.Unactive} />
    </Space>
  );
};
