import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input, Modal, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { unitsApi } from '../../api/units-api';
import { LIST_HIGHLIGHT_ROW_CLASS } from '../../common/list-highlight/list-highlight-row-class';
import { useListRowHighlight } from '../../common/list-highlight/use-list-row-highlight';
import { getErrorMessage } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import type { UnitEntity } from '@stellode/models';
import { useUnit } from '../../context/UnitContext';
import { unitDiagramPath } from '../diagrams/spa-diagram-paths';
import './units.css';

export function Units() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { unit: currentUnit, setUnit } = useUnit();
  const [units, setUnits] = useState<UnitEntity[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitEntity | null>(null);
  const [form] = Form.useForm<{ name: string; description: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    setRowsLoaded(false);
    try {
      setUnits(await unitsApi.list());
    } catch (err) {
      console.error('Error loading units:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    } finally {
      setRowsLoaded(true);
    }
  };

  const rowIds = useMemo(() => new Set(units.map((unit) => unit.id)), [units]);

  const onHighlightMismatch = useCallback(() => {
    showToast('Юнит не найден', ToastVariant.Warning);
  }, [showToast]);

  const { rowClassName: highlightRowClassName } = useListRowHighlight({
    rowsLoaded,
    rowIds,
    onMismatch: onHighlightMismatch,
  });

  const handleOpenDialog = (unit?: UnitEntity) => {
    setEditingUnit(unit ?? null);
    setIsDialogOpen(true);
    setError(null);
  };

  useEffect(() => {
    if (!isDialogOpen) return;
    form.setFieldsValue(
      editingUnit
        ? { name: editingUnit.name || '', description: editingUnit.description || '' }
        : { name: '', description: '' },
    );
  }, [isDialogOpen, editingUnit, form]);

  const handleCloseDialog = () => {
    form.resetFields();
    setIsDialogOpen(false);
    setEditingUnit(null);
    setError(null);
  };

  const handleSubmit = async (values: { name: string; description: string }) => {
    setError(null);

    try {
      if (editingUnit) {
        await unitsApi.update(editingUnit.id, values);
      } else {
        await unitsApi.create(values);
      }
      handleCloseDialog();
      showToast('Юнит сохранён', ToastVariant.Success);
      loadUnits();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      showToast(msg, ToastVariant.Error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот юнит?')) return;

    try {
      await unitsApi.remove(id);
      showToast('Юнит удалён', ToastVariant.Success);
      loadUnits();
    } catch (err: unknown) {
      showToast(getErrorMessage(err), ToastVariant.Error);
    }
  };

  const handleSetMain = (unit: UnitEntity) => {
    setUnit(unit);
    loadUnits();
  };

  const mainUnitId = currentUnit?.id;

  const columns: ColumnsType<UnitEntity> = [
    {
      key: 'name',
      title: 'Название',
      render: (_, unit) => (
        <div className="unit-name-cell">
          <span>{unit.name}</span>
          {mainUnitId && unit.id === mainUnitId ? (
            <Tag color="success">Основной</Tag>
          ) : null}
        </div>
      ),
    },
    {
      key: 'description',
      title: 'Описание',
      render: (_, unit) => unit.description || '-',
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, unit) => (
        <div className="table-actions">
          {unit.id !== mainUnitId ? (
            <Button htmlType="button" type="primary" onClick={() => handleSetMain(unit)}>
              Сделать основным
            </Button>
          ) : null}
          <Button
            htmlType="button"
            onClick={() => navigate(unitDiagramPath(unit.id))}
          >
            Диаграмма
          </Button>
          <Button htmlType="button" onClick={() => handleOpenDialog(unit)}>
            Изменить
          </Button>
          <Button htmlType="button" danger onClick={() => void handleDelete(unit.id)}>
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Юниты</h1>
        <Button htmlType="button" type="primary" onClick={() => handleOpenDialog()}>
          Создать юнит
        </Button>
      </header>

      <Table<UnitEntity>
        columns={columns}
        dataSource={units}
        rowKey={(unit) => unit.id}
        pagination={false}
        rowClassName={(unit) => {
          const classes: string[] = [];
          if (mainUnitId && unit.id === mainUnitId) classes.push(LIST_HIGHLIGHT_ROW_CLASS);
          const highlightClass = highlightRowClassName(unit.id);
          if (highlightClass !== '' && !classes.includes(highlightClass)) {
            classes.push(highlightClass);
          }
          return classes.join(' ');
        }}
      />

      <Modal
        open={isDialogOpen}
        onCancel={handleCloseDialog}
        title={editingUnit ? 'Изменить юнит' : 'Создать юнит'}
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
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input
              placeholder="Название юнита"
              allowClear={!editingUnit}
              autoComplete="off"
              disabled={Boolean(editingUnit)}
            />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="Описание (необязательно)" rows={3} allowClear />
          </Form.Item>
          <Form.Item className="entity-modal-form__footer">
            <Space className="entity-modal-form__actions">
              <Button onClick={handleCloseDialog}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                {editingUnit ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
