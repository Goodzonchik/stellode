import { Button, Select, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { VersionStatus } from '@stellode/models';
import { DeprecatedWarningTriangle } from '../../components/DeprecatedWarningTriangle';
import { deprecatedWarningTooltip } from '../../components/status-warning-tooltip';
import { useStatusWarning } from '../../context/StatusWarningContext';
import { eligibleBumpVersions } from './releaseCatalogEligibility';
import {
  isApplicationStatusLockedToActive,
} from './releaseCompositionRules';
import type { ReleaseComponentRow } from './releaseWizardTypes';
import styles from './ReleaseWizardForm.module.css';

export type ReleaseCompositionTableProps = {
  rows: ReleaseComponentRow[];
  compositionRows?: ReleaseComponentRow[];
  onRemove: (componentVersionId: string) => void;
  onApplicationStatusChange: (componentVersionId: string, status: 'active' | 'deprecated') => void;
  onBumpVersion?: (fromComponentVersionId: string, toComponentVersionId: string) => void;
  showActions?: boolean;
};

const formatOtherApplications = (row: ReleaseComponentRow): string => {
  if (row.otherApplications.length === 0) return '—';
  return row.otherApplications
    .map((item) => `${item.applicationName} (${item.status})`)
    .join(', ');
};

const versionLabel = (version: string, status: string): string => `${version} (${status})`;

export function ReleaseCompositionTable(props: ReleaseCompositionTableProps) {
  const { openForComponentVersion } = useStatusWarning();
  const compositionRows = props.compositionRows ?? props.rows;
  const editable = props.showActions !== false;

  const columns: ColumnsType<ReleaseComponentRow> = [
    {
      title: 'Компонент',
      key: 'component',
      render: (_, row) => (
        <span className="deprecated-warning-name">
          <span>{row.component.name}</span>
          {row.applicationStatus === VersionStatus.Deprecated ? (
            <DeprecatedWarningTriangle
              title={deprecatedWarningTooltip}
              onClick={() => openForComponentVersion(row.componentVersion.id)}
            />
          ) : null}
        </span>
      ),
    },
    {
      title: 'Команда',
      key: 'team',
      render: (_, row) => row.team?.name ?? '—',
    },
    {
      title: 'Версия',
      key: 'version',
      render: (_, row) => {
        if (!editable || !props.onBumpVersion) {
          return row.componentVersion.version;
        }
        const otherSelectedIds = new Set(
          compositionRows
            .filter((item) => item.componentVersion.id !== row.componentVersion.id)
            .map((item) => item.componentVersion.id),
        );
        const bumpEligible = eligibleBumpVersions(
          {
            componentVersionId: row.componentVersion.id,
            versionNumber: row.componentVersion.versionNumber,
            status: row.componentVersion.status,
          },
          row.newerVersions,
          otherSelectedIds,
        );
        if (bumpEligible.length === 0) {
          return row.componentVersion.version;
        }
        return (
          <Select
            aria-label={`Версия для ${row.component.name}`}
            className={styles.targetSelect}
            value={row.componentVersion.id}
            options={[
              {
                value: row.componentVersion.id,
                label: versionLabel(row.componentVersion.version, row.componentVersion.status),
              },
              ...bumpEligible.map((item) => ({
                value: item.id,
                label: versionLabel(item.version, item.status),
              })),
            ]}
            onChange={(toId) => {
              if (toId !== row.componentVersion.id) {
                props.onBumpVersion?.(row.componentVersion.id, toId);
              }
            }}
          />
        );
      },
    },
    {
      title: 'Глобальный статус',
      key: 'lifecycle',
      render: (_, row) => row.componentVersion.status,
    },
    {
      title: 'Статус в приложении',
      key: 'applicationStatus',
      render: (_, row) => {
        const locked = isApplicationStatusLockedToActive(row.componentVersion.status);
        if (locked) {
          return (
            <Typography.Text type="secondary">
              active (черновик публикуется при Release)
            </Typography.Text>
          );
        }
        if (!editable) {
          return row.applicationStatus;
        }
        return (
          <Select<'active' | 'deprecated'>
            aria-label={`Статус в приложении для ${row.component.name}`}
            className={styles.targetSelect}
            value={row.applicationStatus}
            options={[
              { value: VersionStatus.Active, label: VersionStatus.Active },
              { value: VersionStatus.Deprecated, label: VersionStatus.Deprecated },
            ]}
            onChange={(value) => props.onApplicationStatusChange(row.componentVersion.id, value)}
          />
        );
      },
    },
    {
      title: 'Другие приложения',
      key: 'otherApps',
      render: (_, row) => formatOtherApplications(row),
    },
  ];

  if (editable) {
    columns.push({
      title: 'Действия',
      key: 'actions',
      render: (_, row) => (
        <div className="table-actions">
          <Button htmlType="button" danger onClick={() => props.onRemove(row.componentVersion.id)}>
            Убрать
          </Button>
        </div>
      ),
    });
  }

  return (
    <Table
      className="app-table"
      size="small"
      rowKey={(row) => row.componentVersion.id}
      dataSource={props.rows}
      columns={columns}
      pagination={false}
      locale={{ emptyText: 'Нет строк' }}
    />
  );
}
