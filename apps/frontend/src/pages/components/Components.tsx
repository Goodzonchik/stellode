import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { componentsApi } from '../../api/components-api';
import { teamsApi } from '../../api/teams-api';
import { Alert, Button, Form, Input, Modal, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { resolveUnitScopedHighlightMismatch } from '../../common/list-highlight/resolve-unit-scoped-highlight-mismatch';
import { useListRowHighlight } from '../../common/list-highlight/use-list-row-highlight';
import { getErrorMessage, getErrorMessageFromRequest } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { useUnit } from '../../context/UnitContext';
import { ComponentCreateDialog } from './ComponentCreateDialog';
import type { ComponentListTypeFilter } from './component-list-type-filter';
import type { DictionaryNode } from './dictionary-node';
import type { ComponentNode } from './component-node';
import { filterComponents } from './filter-components';
import { getComponentKindLabel } from './get-component-kind-label';
import type { UpdateComponentDto } from '@stellode/models';
import { componentDiagramPath } from '../diagrams/spa-diagram-paths';

type ComponentEditFormValues = {
  name: string;
  description: string;
  teamId: string;
};

const emptyTeamSortKey = '—';

const typeFilterOptions = [
  { value: 'own' as const, label: getComponentKindLabel(false) },
  { value: 'dependency' as const, label: getComponentKindLabel(true) },
];

export function Components() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { unit } = useUnit();
  const [components, setComponents] = useState<ComponentNode[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [teams, setTeams] = useState<DictionaryNode[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<ComponentListTypeFilter>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentNode | null>(null);
  const [form] = Form.useForm<ComponentEditFormValues>();
  const [error, setError] = useState<string | null>(null);

  const unitId = unit?.id;

  useEffect(() => {
    if (!unitId) return;
    loadComponents();
    loadTeams();
  }, [unitId]);

  const loadComponents = async () => {
    if (!unitId) return;
    setRowsLoaded(false);
    try {
      setComponents((await componentsApi.list(unitId)) as ComponentNode[]);
    } catch (err) {
      console.error('Error loading components:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    } finally {
      setRowsLoaded(true);
    }
  };

  const rowIds = useMemo(
    () => new Set(components.map((component) => component.id)),
    [components],
  );

  const filteredComponents = useMemo(
    () => filterComponents(components, nameFilter, teamFilter, typeFilter),
    [components, nameFilter, teamFilter, typeFilter],
  );

  const onHighlightMismatch = useCallback(
    (payload: { highlightId: string; ctx: Readonly<Record<string, string>> }) => {
      resolveUnitScopedHighlightMismatch(payload, {
        currentUnitId: unitId,
        navigate,
        showToast,
        missingInUnitMessage: 'Компонент не найден в текущем юните',
        otherUnitMessage: 'Компонент относится к другому юниту',
      });
    },
    [unitId, navigate, showToast],
  );

  const { rowClassName } = useListRowHighlight({
    rowsLoaded,
    rowIds,
    onMismatch: onHighlightMismatch,
  });

  const loadTeams = async () => {
    if (!unitId) return;
    try {
      setTeams(await teamsApi.list(unitId));
    } catch (err) {
      console.error('Error loading teams:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    }
  };

  const openEditDialog = (component: ComponentNode) => {
    setEditingComponent(component);
    setEditDialogOpen(true);
    setError(null);
  };

  useEffect(() => {
    if (!editDialogOpen || !editingComponent) return;
    form.setFieldsValue({
      name: editingComponent.name || '',
      description: editingComponent.description || '',
      teamId: editingComponent.team?.id || '',
    });
  }, [editDialogOpen, editingComponent, form]);

  const closeEditDialog = () => {
    form.resetFields();
    setEditDialogOpen(false);
    setEditingComponent(null);
    setError(null);
  };

  const handleSubmitEdit = async (values: ComponentEditFormValues) => {
    setError(null);

    try {
      if (!unitId) {
        setError('Нужен юнит');
        return;
      }
      if (!editingComponent) return;
      const payload: UpdateComponentDto = {
        unitId,
        description: values.description || undefined,
        teamId: values.teamId,
      };

      await componentsApi.update(editingComponent.id, payload);
      closeEditDialog();
      showToast('Компонент сохранён', ToastVariant.Success);
      loadComponents();
    } catch (err: unknown) {
      const text = getErrorMessageFromRequest(err, 'Не удалось сохранить компонент');

      setError(text);
      showToast(text, ToastVariant.Error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот компонент?')) {
      return;
    }

    try {
      await componentsApi.remove(id);
      showToast('Компонент удалён', ToastVariant.Success);
      loadComponents();
    } catch (err: unknown) {
      const text = getErrorMessageFromRequest(err, 'Не удалось удалить компонент');
      showToast(text, ToastVariant.Error);
    }
  };

  const teamSelectOptions = teams.map((team) => ({ value: team.id, label: team.name }));

  const columns: ColumnsType<ComponentNode> = [
    {
      key: 'name',
      title: 'Название',
      dataIndex: 'name',
      sorter: (left, right) => left.name.localeCompare(right.name),
    },
    {
      key: 'description',
      title: 'Описание',
      render: (_, component) => component.description || '-',
    },
    {
      key: 'team',
      title: 'Команда',
      render: (_, component) => component.team?.name || emptyTeamSortKey,
      sorter: (left, right) =>
        (left.team?.name ?? emptyTeamSortKey).localeCompare(
          right.team?.name ?? emptyTeamSortKey,
        ),
    },
    {
      key: 'type',
      title: 'Тип',
      render: (_, component) => getComponentKindLabel(component.isDependency),
      sorter: (left, right) =>
        getComponentKindLabel(left.isDependency).localeCompare(
          getComponentKindLabel(right.isDependency),
        ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, component) => (
        <div className="table-actions">
          <Button
            htmlType="button"
            onClick={() => navigate(`/components/${encodeURIComponent(component.id)}`)}
          >
            Версии
          </Button>
          <Button
            htmlType="button"
            onClick={() => navigate(componentDiagramPath(component.id))}
          >
            Диаграмма
          </Button>
          <Button htmlType="button" onClick={() => openEditDialog(component)}>
            Изменить
          </Button>
          <Button htmlType="button" danger onClick={() => void handleDelete(component.id)}>
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Компоненты</h1>
        <Button htmlType="button" type="primary" onClick={() => setCreateDialogOpen(true)}>
          Создать компонент
        </Button>
      </header>

      <div className="app-filters">
        <Input
          allowClear
          className="app-filter-input"
          placeholder="Фильтр по имени"
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="app-filter-input"
          placeholder="Все команды"
          value={teamFilter || undefined}
          options={teamSelectOptions}
          onChange={(value) => setTeamFilter(value ?? '')}
        />
        <Select
          allowClear
          className="app-filter-input"
          placeholder="Все типы"
          value={typeFilter || undefined}
          options={typeFilterOptions}
          onChange={(value) => setTypeFilter(value ?? '')}
        />
      </div>

      <Table<ComponentNode>
        columns={columns}
        dataSource={filteredComponents}
        rowKey={(component) => component.id}
        pagination={false}
        rowClassName={(component) => rowClassName(component.id)}
      />

      <ComponentCreateDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        unitId={unitId}
        onSuccess={loadComponents}
      />

      <Modal
        open={editDialogOpen}
        onCancel={closeEditDialog}
        title="Редактирование компонента"
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
        <Form form={form} layout="vertical" onFinish={(values) => void handleSubmitEdit(values)}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input
              placeholder="Название компонента"
              allowClear={!editingComponent}
              autoComplete="off"
              disabled={Boolean(editingComponent)}
            />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} allowClear />
          </Form.Item>
          <Form.Item label="Тип">
            <Typography.Text>
              {getComponentKindLabel(editingComponent?.isDependency)}
            </Typography.Text>
          </Form.Item>
          <Form.Item
            name="teamId"
            label="Команда"
            rules={[{ required: true, message: 'Выберите команду' }]}
          >
            <Select
              placeholder="Выберите команду"
              options={teamSelectOptions}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
          <Form.Item className="entity-modal-form__footer">
            <Space className="entity-modal-form__actions">
              <Button onClick={closeEditDialog}>Отмена</Button>
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
