import { useState, useEffect } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { applicationVersionsApi } from '../../api/application-versions-api';
import { Button, Space, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ApplicationReleaseStatusTag } from '../../components/ApplicationReleaseStatusTag';
import { getErrorMessage } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplicationVersionStatus, type ApplicationVersionRow } from '@stellode/models';
import { RevertConsequencesModal } from './RevertConsequencesModal';
import { RenameApplicationVersionModal } from './RenameApplicationVersionModal';
import { applicationVersionDiagramPath } from '../diagrams/spa-diagram-paths';
import styles from './ApplicationVersions.module.css';

const isCurrentVersion = (r: ApplicationVersionRow) =>
  r.status === ApplicationVersionStatus.Current;

export function ApplicationVersions() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ApplicationVersionRow[]>([]);
  const applicationElementId = useParams().id;
  const navigate = useNavigate();
  const [revertOpen, setRevertOpen] = useState(false);
  const [revertSourceId, setRevertSourceId] = useState<string | null>(null);
  const [renameRow, setRenameRow] = useState<ApplicationVersionRow | null>(null);

  useEffect(() => {
    if (!applicationElementId) return;
    loadRows();
  }, [applicationElementId]);

  const loadRows = async () => {
    if (!applicationElementId) return;
    try {
      const data = await applicationVersionsApi.list(applicationElementId);
      setRows(data);
    } catch (err) {
      console.error('Error loading application versions:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    }
  };

  const openRevertModal = () => {
    const currentRow = rows.find((row) => row.status === ApplicationVersionStatus.Current);
    if (!applicationElementId || !currentRow) return;
    setRevertSourceId(currentRow.id);
    setRevertOpen(true);
  };

  const handleReverted = () => {
    showToast('Откат выполнен: создана новая текущая версия', ToastVariant.Success);
    void loadRows();
  };

  const handleRenamed = () => {
    showToast('Версия переименована', ToastVariant.Success);
    void loadRows();
  };

  const canRevert = rows.length > 1;

  const columns: ColumnsType<ApplicationVersionRow> = [
    { key: 'name', title: 'Название', dataIndex: 'name' },
    {
      key: 'description',
      title: 'Описание',
      render: (_, r) => r.description || '-',
    },
    {
      key: 'version',
      title: 'Версия',
      render: (_, r) => (
        <span className={styles.versionCell}>
          <span>{r.version}</span>
          {isCurrentVersion(r) ? (
            <Tooltip title="Переименовать версию">
              <Button
                htmlType="button"
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label="Переименовать версию"
                onClick={() => setRenameRow(r)}
              />
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (_, r) => <ApplicationReleaseStatusTag status={r.status} />,
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, r) => (
        <div className="table-actions">
          {applicationElementId ? (
            <Button
              htmlType="button"
              onClick={() =>
                navigate(
                  applicationVersionDiagramPath(
                    applicationElementId,
                    isCurrentVersion(r) ? 'current' : r.version,
                  ),
                )
              }
            >
              Состав
            </Button>
          ) : null}
          {isCurrentVersion(r) && applicationElementId && canRevert ? (
            <Button htmlType="button" onClick={openRevertModal}>
              Откат к предыдущему релизу
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Версии приложения</h1>
        {applicationElementId ? (
          <Space wrap>
            <Button
              htmlType="button"
              type="primary"
              onClick={() => navigate(`/applications/${applicationElementId}/release`)}
            >
              Новый релиз
            </Button>
          </Space>
        ) : null}
      </header>
      <Table<ApplicationVersionRow>
        columns={columns}
        dataSource={rows}
        rowKey={(r) => r.id}
        pagination={false}
      />
      {applicationElementId && revertSourceId ? (
        <RevertConsequencesModal
          open={revertOpen}
          applicationId={applicationElementId}
          sourceApplicationVersionId={revertSourceId}
          onClose={() => setRevertOpen(false)}
          onReverted={handleReverted}
        />
      ) : null}
      <RenameApplicationVersionModal
        open={renameRow !== null}
        row={renameRow}
        onClose={() => setRenameRow(null)}
        onRenamed={handleRenamed}
      />
    </section>
  );
}
