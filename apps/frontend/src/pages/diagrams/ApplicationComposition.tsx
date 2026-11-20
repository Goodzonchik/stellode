import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag } from 'antd';
import { applicationVersionsApi } from '../../api/application-versions-api';
import type { ColumnsType } from 'antd/es/table';
import { Link, useParams } from 'react-router-dom';
import {
  ApplicationVersionStatus,
  VersionStatus,
  type ApplicationVersionComposition,
  type ApplicationVersionCompositionItem,
} from '@stellode/models';
import { DeprecatedWarningTriangle } from '../../components/DeprecatedWarningTriangle';
import { statusWarningTooltipForKind } from '../../components/status-warning-tooltip';
import { useStatusWarning } from '../../context/StatusWarningContext';
import { getErrorMessage } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { uniqueTeamFilterOptions } from '../application-versions/releaseCatalogEligibility';
import { NotFound } from '../NotFound';
import { filterApplicationCompositionItems } from './filter-application-composition-items';
import { resolveApplicationCompositionVersionId } from './resolve-application-composition-version-id';
import styles from './ApplicationComposition.module.css';

const statusLabel = (status: ApplicationVersionCompositionItem['status']): string =>
  status === VersionStatus.Deprecated ? 'deprecated' : 'active';

const statusColor = (status: ApplicationVersionCompositionItem['status']): string =>
  status === VersionStatus.Deprecated ? 'orange' : 'green';

const compositionWarningKind = (
  row: ApplicationVersionCompositionItem,
  isCurrent: boolean,
): 'deprecated' | 'unactive' | null => {
  if (isCurrent && row.status === VersionStatus.Deprecated) return 'deprecated';
  if (!isCurrent && row.componentVersionStatus === VersionStatus.Unactive) return 'unactive';
  if (!isCurrent && row.status === VersionStatus.Deprecated) return 'deprecated';
  return null;
};

export function ApplicationComposition() {
  const { showToast } = useToast();
  const { openForComponentVersion } = useStatusWarning();
  const { id: applicationId, version } = useParams<{
    id: string;
    version: string;
  }>();
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composition, setComposition] = useState<ApplicationVersionComposition | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      if (!applicationId || !version) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (version === 'latest') {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      try {
        const versionRows = await applicationVersionsApi.list(applicationId);
        const versionId = resolveApplicationCompositionVersionId(versionRows, version);
        if (!versionId) {
          if (!cancelled) {
            setNotFound(true);
            setComposition(null);
          }
          return;
        }
        const compositionData = await applicationVersionsApi.composition(versionId);
        if (!cancelled) setComposition(compositionData);
      } catch (error) {
        if (cancelled) return;
        const status =
          error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
        if (status === 404) {
          setNotFound(true);
          setComposition(null);
          return;
        }
        showToast(getErrorMessage(error), ToastVariant.Error);
        setNotFound(true);
        setComposition(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [applicationId, version, showToast]);

  const teamFilterOptions = useMemo(
    () =>
      uniqueTeamFilterOptions(
        (composition?.items ?? []).map((item) =>
          item.teamId && item.teamName
            ? { id: item.teamId, name: item.teamName }
            : null,
        ),
      ),
    [composition],
  );

  const filteredItems = useMemo(
    () =>
      filterApplicationCompositionItems(composition?.items ?? [], nameFilter, teamFilter),
    [composition, nameFilter, teamFilter],
  );

  const isCurrent = composition?.status === ApplicationVersionStatus.Current;

  const columns: ColumnsType<ApplicationVersionCompositionItem> = [
    {
      key: 'componentName',
      title: 'Название компонента',
      render: (_, row) => {
        const warningKind = compositionWarningKind(row, isCurrent === true);
        return (
          <span className="deprecated-warning-name">
            <span>{row.componentName}</span>
            {warningKind !== null ? (
              <DeprecatedWarningTriangle
                title={statusWarningTooltipForKind(warningKind)}
                onClick={() => openForComponentVersion(row.componentVersionId)}
              />
            ) : null}
          </span>
        );
      },
    },
    {
      key: 'team',
      title: 'Команда',
      render: (_, row) => row.teamName ?? '—',
    },
    {
      key: 'componentVersion',
      title: 'Версия',
      dataIndex: 'componentVersion',
    },
    {
      key: 'status',
      title: 'Статус в версии',
      render: (_, row) => <Tag color={statusColor(row.status)}>{statusLabel(row.status)}</Tag>,
    },
  ];

  if (notFound) return <NotFound />;

  const headingVersion = composition?.version ?? version ?? '';
  const headingStatus =
    composition?.status === ApplicationVersionStatus.Previous ? 'previous' : 'current';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Состав приложения {headingVersion}
          {composition ? ` (${headingStatus})` : ''}
        </h1>
        <Space wrap>
          {applicationId ? (
            <Link to={`/applications/${applicationId}`}>
              <Button htmlType="button">К версиям</Button>
            </Link>
          ) : null}
        </Space>
      </header>

      <div className="app-filters">
        <Input
          className="app-filter-input"
          placeholder="Фильтр по имени"
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          allowClear
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="app-filter-input"
          placeholder="Все команды"
          value={teamFilter || undefined}
          options={teamFilterOptions}
          onChange={(value) => setTeamFilter(value ?? '')}
        />
      </div>

      <div className="app-table-wrap">
        <Table<ApplicationVersionCompositionItem>
          rowKey={(row) => row.componentVersionId}
          loading={loading}
          columns={columns}
          dataSource={filteredItems}
          pagination={false}
        />
      </div>
    </div>
  );
}
