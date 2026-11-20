import { Tag } from 'antd';
import {
  type ApplicationVersionStatus,
} from '@stellode/models';
import { releaseStatusLabel } from '../utils/status-label';

const colorByStatus: Record<ApplicationVersionStatus, string> = {
  current: 'success',
  previous: 'default',
};

export const ApplicationReleaseStatusTag = (props: {
  readonly status: ApplicationVersionStatus;
}) => (
  <Tag color={colorByStatus[props.status]}>{releaseStatusLabel(props.status)}</Tag>
);
