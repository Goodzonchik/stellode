import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { componentVersionsApi } from '../../api/component-versions-api';
import { Button, Input, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { VersionLifecycleStatusTag } from '../../components/VersionLifecycleStatusTag';
import { useStatusWarning } from '../../context/StatusWarningContext';
import { getErrorMessage, getErrorMessageFromRequest } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import {
  parseVersionStatus,
  suggestNextComponentOrFeatureVersionString,
  VersionStatus as VersionStatusConst,
  type ComponentVersionListItem,
} from '@stellode/models';
import styles from './ComponentVersions.module.css';

type ComponentVersionRow = ComponentVersionListItem;

export function ComponentVersions() {
  const { showToast } = useToast();
  const { openForComponentVersion } = useStatusWarning();
  const [rows, setRows] = useState<ComponentVersionRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createVersion, setCreateVersion] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const componentElementId = useParams().id;

  const suggestedVersion = useMemo(() => {
    const maxNum = rows.length
      ? Math.max(...rows.map((row) => Number(row.versionNumber ?? -1)))
      : null;
    return suggestNextComponentOrFeatureVersionString(
      maxNum === null || Number.isNaN(maxNum) ? null : maxNum,
    );
  }, [rows]);

  useEffect(() => {
    if (!componentElementId) return;
    loadRows();
  }, [componentElementId]);

  const loadRows = async () => {
    if (!componentElementId) return;
    try {
      const data = await componentVersionsApi.list(componentElementId);
      setRows(data);
    } catch (err) {
      console.error('Error loading component versions:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    }
  };

  const openCreateModal = () => {
    setCreateVersion(suggestedVersion);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!componentElementId) return;
    setCreateLoading(true);
    try {
      await componentVersionsApi.create({
        componentElementId,
        version: createVersion.trim(),
      });
      showToast('Версия создана', ToastVariant.Success);
      setCreateOpen(false);
      loadRows();
    } catch (err: unknown) {
      const text = getErrorMessageFromRequest(err, 'Не удалось создать версию');
      showToast(text, ToastVariant.Error);
    } finally {
      setCreateLoading(false);
    }
  };

  const columns: ColumnsType<ComponentVersionRow> = [
    { key: 'name', title: 'Название', dataIndex: 'name' },
    {
      key: 'description',
      title: 'Описание',
      render: (_, row) => row.description || '-',
    },
    { key: 'version', title: 'Версия', dataIndex: 'version' },
    {
      key: 'status',
      title: 'Статус',
      render: (_, row) => (
        <VersionLifecycleStatusTag
          status={parseVersionStatus(row.status)}
          onWarningClick={() => openForComponentVersion(row.id)}
        />
      ),
    },
    {
      key: 'usage',
      title: 'Приложения (текущий релиз)',
      render: (_, row) => {
        const usage = row.usage ?? [];
        if (usage.length === 0) return '—';
        return (
          <ul className={styles.usageList}>
            {usage.map((item) => (
              <li key={`${row.id}-${item.applicationId}`}>
                <Link to={`/applications/${item.applicationId}`}>
                  {item.applicationName}
                </Link>{' '}
                (
                {item.status === 'active'
                  ? 'Активен'
                  : item.status === 'deprecated'
                    ? 'Устарел'
                    : item.status}
                )
              </li>
            ))}
          </ul>
        );
      },
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Версии компонента</h1>
        <div className="table-actions">
          <Button
            htmlType="button"
            type="primary"
            onClick={openCreateModal}
            disabled={rows.some((row) => row.status === VersionStatusConst.Draft)}
          >
            Создать версию
          </Button>
        </div>
      </header>
      <Table<ComponentVersionRow>
        columns={columns}
        dataSource={rows}
        rowKey={(row) => row.id}
        pagination={false}
      />
      <Modal
        title="Новая версия компонента"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={createLoading}
        okText="Создать"
        cancelText="Отмена"
      >
        <label className="entity-modal-form__field">
          <span>Версия</span>
          <Input
            value={createVersion}
            onChange={(event) => setCreateVersion(event.target.value)}
            placeholder={suggestedVersion}
          />
        </label>
      </Modal>
    </section>
  );
}
