import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Button, Form, Input, Modal, Space, Table } from 'antd';
import { applicationsApi } from '../../api/applications-api';
import type { ColumnsType } from 'antd/es/table';
import { resolveUnitScopedHighlightMismatch } from '../../common/list-highlight/resolve-unit-scoped-highlight-mismatch';
import { useListRowHighlight } from '../../common/list-highlight/use-list-row-highlight';
import { getErrorMessage, getErrorMessageFromRequest } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { useUnit } from '../../context/UnitContext';
import { useNavigate } from 'react-router-dom';
import type {
  ApplicationEntity,
  ApplicationListItem,
  UpdateApplicationDto,
} from '@stellode/models';
import { DeprecatedWarningTriangle } from '../../components/DeprecatedWarningTriangle';
import { useStatusWarning } from '../../context/StatusWarningContext';
import { ApplicationCreateDialog } from './ApplicationCreateDialog';
import { ApplicationListVersionCell } from './ApplicationListVersionCell';
import { applicationVersionDiagramPath } from '../diagrams/spa-diagram-paths';

export function Applications() {
  const { showToast } = useToast();
  const { openForApplication } = useStatusWarning();
  const { unit } = useUnit();
  const [application, setApplication] = useState<ApplicationListItem[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationEntity | null>(null);
  const [form] = Form.useForm<{ name: string; description: string }>();
  const [error, setError] = useState<string | null>(null);

  const unitId = unit?.id;
  const navigate = useNavigate();

  useEffect(() => {
    if (!unitId) return;
    void loadApplication();
  }, [unitId]);

  const loadApplication = async () => {
    if (!unitId) return;
    setRowsLoaded(false);
    try {
      const rows = await applicationsApi.list(unitId);
      setApplication(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('Error loading application:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    } finally {
      setRowsLoaded(true);
    }
  };

  const rowIds = useMemo(
    () => new Set(application.map((app) => app.id)),
    [application],
  );

  const onHighlightMismatch = useCallback(
    (payload: { highlightId: string; ctx: Readonly<Record<string, string>> }) => {
      resolveUnitScopedHighlightMismatch(payload, {
        currentUnitId: unitId,
        navigate,
        showToast,
        missingInUnitMessage: 'Приложение не найдено в текущем юните',
        otherUnitMessage: 'Приложение относится к другому юниту',
      });
    },
    [unitId, navigate, showToast],
  );

  const { rowClassName } = useListRowHighlight({
    rowsLoaded,
    rowIds,
    onMismatch: onHighlightMismatch,
  });

  useEffect(() => {
    if (editingApp === null) return;
    form.setFieldsValue({
      name: editingApp.name || '',
      description: editingApp.description ?? '',
    });
  }, [editingApp, form]);

  const handleCloseEdit = () => {
    form.resetFields();
    setEditingApp(null);
    setError(null);
  };

  const handleSubmitEdit = async (values: { name: string; description: string }) => {
    if (editingApp === null) return;
    setError(null);
    try {
      const payload: UpdateApplicationDto = {
        name: values.name,
        description: values.description || undefined,
      };
      await applicationsApi.update(editingApp.id, payload);
      handleCloseEdit();
      showToast('Приложение сохранено', ToastVariant.Success);
      void loadApplication();
    } catch (err: unknown) {
      const messageText = getErrorMessageFromRequest(err, 'Не удалось сохранить приложение');
      setError(messageText);
      showToast(messageText, ToastVariant.Error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить это приложение?')) {
      return;
    }

    try {
      await applicationsApi.remove(id);
      showToast('Приложение удалено', ToastVariant.Success);
      void loadApplication();
    } catch (err: unknown) {
      const messageText = getErrorMessageFromRequest(err, 'Не удалось удалить приложение');
      showToast(messageText, ToastVariant.Error);
    }
  };

  const columns: ColumnsType<ApplicationListItem> = [
    {
      key: 'name',
      title: 'Название',
      render: (_, app) => (
        <span className="deprecated-warning-name">
          <span>{app.name}</span>
          {app.hasStatusWarning ? (
            <DeprecatedWarningTriangle
              title="Есть компоненты с предупреждением (deprecated / unactive)"
              onClick={() => openForApplication(app.id)}
            />
          ) : null}
        </span>
      ),
    },
    {
      key: 'description',
      title: 'Описание',
      render: (_, app) => app.description || '-',
    },
    {
      key: 'version',
      title: 'Версия',
      render: (_, app) => <ApplicationListVersionCell row={app} />,
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, app) => (
        <div className="table-actions">
          <Button htmlType="button" onClick={() => navigate(`/applications/${app.id}`)}>
            Версии
          </Button>
          <Button
            htmlType="button"
            onClick={() => navigate(`/applications/${app.id}/release`)}
          >
            Новый релиз
          </Button>
          <Button
            htmlType="button"
            onClick={() => navigate(applicationVersionDiagramPath(app.id, 'current'))}
          >
            Состав
          </Button>
          <Button htmlType="button" onClick={() => setEditingApp(app)}>
            Изменить
          </Button>
          <Button htmlType="button" danger onClick={() => void handleDelete(app.id)}>
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Приложения</h1>
        <Button htmlType="button" type="primary" onClick={() => setCreateOpen(true)}>
          Создать приложение
        </Button>
      </header>

      <Table<ApplicationListItem>
        columns={columns}
        dataSource={application}
        rowKey={(app) => app.id}
        pagination={false}
        rowClassName={(app) => rowClassName(app.id)}
      />

      <ApplicationCreateDialog
        open={createOpen}
        unitId={unitId}
        onCancel={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void loadApplication();
        }}
      />

      <Modal
        open={editingApp !== null}
        onCancel={handleCloseEdit}
        title="Изменить приложение"
        footer={null}
        destroyOnHidden
      >
        {error ? (
          <Alert
            type="error"
            title={error}
            showIcon
            className="entity-modal-form__alert"
            closable={{ onClose: () => setError(null) }}
          />
        ) : null}
        <Form form={form} layout="vertical" onFinish={(v) => void handleSubmitEdit(v)}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input placeholder="Название приложения" autoComplete="off" disabled />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="Описание (необязательно)" rows={3} allowClear />
          </Form.Item>
          <Form.Item className="entity-modal-form__footer">
            <Space className="entity-modal-form__actions">
              <Button onClick={handleCloseEdit}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                Сохранить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
