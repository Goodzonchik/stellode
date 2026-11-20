import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Button, Form, Input, Modal, Space, Table } from 'antd';
import { teamsApi } from '../../api/teams-api';
import type { ColumnsType } from 'antd/es/table';
import { resolveUnitScopedHighlightMismatch } from '../../common/list-highlight/resolve-unit-scoped-highlight-mismatch';
import { useListRowHighlight } from '../../common/list-highlight/use-list-row-highlight';
import { useUnit } from '../../context/UnitContext';
import { useNavigate } from 'react-router-dom';
import type { CreateTeamDto, TeamEntity, UpdateTeamDto } from '@stellode/models';
import { getErrorMessage, getErrorMessageFromRequest } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { teamDiagramPath } from '../diagrams/spa-diagram-paths';

export function Teams() {
  const { showToast } = useToast();
  const { unit } = useUnit();
  const [teams, setTeams] = useState<TeamEntity[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamEntity | null>(null);
  const [form] = Form.useForm<{ name: string; description: string }>();
  const [error, setError] = useState<string | null>(null);

  const unitId = unit?.id;
  const navigate = useNavigate();

  useEffect(() => {
    if (!unitId) return;
    void loadTeams();
  }, [unitId]);

  const loadTeams = async () => {
    if (!unitId) return;
    setRowsLoaded(false);
    try {
      setTeams(await teamsApi.list(unitId));
    } catch (err) {
      console.error('Error loading teams:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    } finally {
      setRowsLoaded(true);
    }
  };

  const rowIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams]);

  const onHighlightMismatch = useCallback(
    (payload: { highlightId: string; ctx: Readonly<Record<string, string>> }) => {
      resolveUnitScopedHighlightMismatch(payload, {
        currentUnitId: unitId,
        navigate,
        showToast,
        missingInUnitMessage: 'Команда не найдена в текущем юните',
        otherUnitMessage: 'Команда относится к другому юниту',
      });
    },
    [unitId, navigate, showToast],
  );

  const { rowClassName } = useListRowHighlight({
    rowsLoaded,
    rowIds,
    onMismatch: onHighlightMismatch,
  });

  const handleView = (team?: TeamEntity) => {
    if (!team?.id) return;

    navigate(teamDiagramPath(team.id));
  };

  const handleOpenDialog = (team?: TeamEntity) => {
    setEditingTeam(team ?? null);
    setIsDialogOpen(true);
    setError(null);
  };

  useEffect(() => {
    if (!isDialogOpen) return;
    form.setFieldsValue({
      name: editingTeam?.name || '',
      description: editingTeam?.description ?? '',
    });
  }, [isDialogOpen, editingTeam, form]);

  const handleCloseDialog = () => {
    form.resetFields();
    setIsDialogOpen(false);
    setEditingTeam(null);
    setError(null);
  };

  const handleSubmit = async (values: { name: string; description: string }) => {
    setError(null);

    const effectiveUnitId = unitId || '';
    if (!effectiveUnitId) {
      setError('Выберите основной юнит');
      return;
    }

    try {
      if (editingTeam) {
        const payload: UpdateTeamDto = {
          name: values.name,
          description: values.description || undefined,
        };
        await teamsApi.update(editingTeam.id, payload);
      } else {
        const payload: CreateTeamDto = {
          name: values.name,
          unitId: effectiveUnitId,
          description: values.description || undefined,
        };
        await teamsApi.create(payload);
      }
      handleCloseDialog();
      showToast('Команда сохранена', ToastVariant.Success);
      loadTeams();
    } catch (err: unknown) {
      const messageText = getErrorMessageFromRequest(err, 'Не удалось сохранить команду');

      setError(messageText);
      showToast(messageText, ToastVariant.Error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту команду?')) {
      return;
    }

    try {
      await teamsApi.remove(id);
      showToast('Команда удалена', ToastVariant.Success);
      loadTeams();
    } catch (err: unknown) {
      const messageText = getErrorMessageFromRequest(err, 'Не удалось удалить команду');
      showToast(messageText, ToastVariant.Error);
    }
  };

  const columns: ColumnsType<TeamEntity> = [
    {
      key: 'name',
      title: 'Название',
      dataIndex: 'name',
    },
    {
      key: 'description',
      title: 'Описание',
      render: (_, team) => team.description || '-',
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, team) => (
        <div className="table-actions">
          <Button htmlType="button" onClick={() => handleView(team)}>
            Диаграмма
          </Button>
          <Button htmlType="button" onClick={() => handleOpenDialog(team)}>
            Изменить
          </Button>
          <Button htmlType="button" danger onClick={() => void handleDelete(team.id)}>
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Команды</h1>
        <Button htmlType="button" type="primary" onClick={() => handleOpenDialog()}>
          Создать команду
        </Button>
      </header>

      <Table<TeamEntity>
        columns={columns}
        dataSource={teams}
        rowKey={(team) => team.id}
        rowClassName={(team) => rowClassName(team.id)}
        pagination={false}
      />

      <Modal
        open={isDialogOpen}
        onCancel={handleCloseDialog}
        title={editingTeam ? 'Изменить команду' : 'Создать команду'}
        footer={null}
        destroyOnHidden
      >
        {error && (
          <Alert
            type="error"
            title={error}
            showIcon
            className="entity-modal-form__alert"
            closable={{ onClose: () => setError(null) }}
          />
        )}
        <Form form={form} layout="vertical" onFinish={(v) => void handleSubmit(v)}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input
              placeholder="Название команды"
              allowClear={!editingTeam}
              autoComplete="off"
              disabled={Boolean(editingTeam)}
            />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="Описание (необязательно)" rows={3} allowClear />
          </Form.Item>
          <Form.Item className="entity-modal-form__footer">
            <Space className="entity-modal-form__actions">
              <Button onClick={handleCloseDialog}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                {editingTeam ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
