import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Button, Checkbox, Form, Input, Modal, Space, Table } from 'antd';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { featuresApi } from '../../api/features-api';
import { servicesApi } from '../../api/services-api';
import type { ColumnsType } from 'antd/es/table';
import { resolveUnitScopedHighlightMismatch } from '../../common/list-highlight/resolve-unit-scoped-highlight-mismatch';
import { useListRowHighlight } from '../../common/list-highlight/use-list-row-highlight';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { useCrudPageFeedback } from '../../hooks/useCrudPageFeedback';
import { useUnit } from '../../context/UnitContext';
import { useNavigate } from 'react-router-dom';
import type {
  CreateFeatureDto,
  FeatureWithServices,
  ServiceEntity,
  UpdateFeatureDto,
} from '@stellode/models';
import type { FeatureVersionLegendRow } from '../diagrams/feature-version-legend-row';
import { resolveDefaultFeatureVersionId } from '../diagrams/resolve-default-feature-version-id';
import { featureVersionDiagramPath } from '../diagrams/spa-diagram-paths';

type Feature = FeatureWithServices;

type FeatureFormValues = {
  name: string;
  description: string;
  serviceIds: string[];
};

const defaultFeatureFormValues = (): FeatureFormValues => ({
  name: '',
  description: '',
  serviceIds: [],
});

export function Features() {
  const { showToast } = useToast();
  const { error, setError, clearError, reportFormError, toastError, runListLoad } =
    useCrudPageFeedback();
  const { unit } = useUnit();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [services, setServices] = useState<Pick<ServiceEntity, 'id' | 'name'>[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [form] = Form.useForm<FeatureFormValues>();

  const unitId = unit?.id;
  const navigate = useNavigate();

  useEffect(() => {
    if (!unitId) return;
    void loadFeatures();
    void loadServices();
  }, [unitId]);

  const loadFeatures = async () => {
    if (!unitId) return;
    await runListLoad({
      load: () => featuresApi.list<Feature>(unitId),
      onSuccess: setFeatures,
      setRowsLoaded,
      logLabel: 'features',
    });
  };

  const rowIds = useMemo(() => new Set(features.map((feature) => feature.id)), [features]);

  const onHighlightMismatch = useCallback(
    (payload: { highlightId: string; ctx: Readonly<Record<string, string>> }) => {
      resolveUnitScopedHighlightMismatch(payload, {
        currentUnitId: unitId,
        navigate,
        showToast,
        missingInUnitMessage: 'Фича не найдена в текущем юните',
        otherUnitMessage: 'Фича относится к другому юниту',
      });
    },
    [unitId, navigate, showToast],
  );

  const { rowClassName } = useListRowHighlight({
    rowsLoaded,
    rowIds,
    onMismatch: onHighlightMismatch,
  });

  const loadServices = async () => {
    if (!unitId) return;
    await runListLoad({
      load: () => servicesApi.list(unitId),
      onSuccess: setServices,
      logLabel: 'services',
    });
  };

  const handleNavigateToVersions = (feature: Feature) => {
    navigate(`/features/${feature.id}`);
  };

  const handleNavigateToDiagram = async (feature: Feature) => {
    try {
      const versions = await featureVersionsApi.list<FeatureVersionLegendRow>(feature.id);
      const versionId = resolveDefaultFeatureVersionId(versions ?? []);
      if (!versionId) {
        showToast('Нет версий для отображения диаграммы', ToastVariant.Error);
        return;
      }
      navigate(featureVersionDiagramPath(versionId));
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenDialog = (feature?: Feature) => {
    setEditingFeature(feature ?? null);
    setIsDialogOpen(true);
    clearError();
  };

  useEffect(() => {
    if (!isDialogOpen) return;
    form.setFieldsValue(
      editingFeature
        ? {
            name: editingFeature.name || '',
            description: editingFeature.description || '',
            serviceIds: editingFeature.services?.map((s) => s.id) || [],
          }
        : defaultFeatureFormValues(),
    );
  }, [isDialogOpen, editingFeature, form]);

  const handleCloseDialog = () => {
    form.resetFields();
    setIsDialogOpen(false);
    setEditingFeature(null);
    clearError();
  };

  const handleSubmit = async (values: FeatureFormValues) => {
    clearError();

    try {
      if (editingFeature) {
        const payload: UpdateFeatureDto = {
          name: values.name,
          description: values.description || undefined,
          serviceIds: values.serviceIds ?? [],
        };
        await featuresApi.update(editingFeature.id, payload);
      } else {
        const payload: CreateFeatureDto = {
          name: values.name,
          description: values.description || undefined,
          serviceIds: values.serviceIds ?? [],
          unitId: unit?.id ?? '',
        };
        await featuresApi.create(payload);
      }
      handleCloseDialog();
      showToast('Фича сохранена', ToastVariant.Success);
      loadFeatures();
    } catch (err: unknown) {
      reportFormError(err, 'Не удалось сохранить фичу');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту фичу?')) {
      return;
    }

    try {
      await featuresApi.remove(id);
      showToast('Фича удалена', ToastVariant.Success);
      loadFeatures();
    } catch (err: unknown) {
      toastError(err, 'Не удалось удалить фичу');
    }
  };

  const serviceCheckboxOptions = services.map((s) => ({ label: s.name, value: s.id }));

  const columns: ColumnsType<Feature> = [
    {
      key: 'name',
      title: 'Название',
      dataIndex: 'name',
    },
    {
      key: 'description',
      title: 'Описание',
      render: (_, feature) => feature.description || '-',
    },
    {
      key: 'services',
      title: 'Услуги',
      render: (_, feature) =>
        feature.services && feature.services.length > 0
          ? feature.services.map((s) => s.name).join(', ')
          : '-',
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, feature) => (
        <div className="table-actions">
          <Button htmlType="button" onClick={() => handleNavigateToVersions(feature)}>
            Версии
          </Button>
          <Button htmlType="button" onClick={() => void handleNavigateToDiagram(feature)}>
            Диаграмма
          </Button>
          <Button htmlType="button" onClick={() => handleOpenDialog(feature)}>
            Изменить
          </Button>
          <Button htmlType="button" danger onClick={() => void handleDelete(feature.id)}>
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Фичи</h1>
        <Button htmlType="button" type="primary" onClick={() => handleOpenDialog()}>
          Создать фичу
        </Button>
      </header>

      <Table<Feature>
        columns={columns}
        dataSource={features}
        rowKey={(feature) => feature.id}
        rowClassName={(feature) => rowClassName(feature.id)}
        pagination={false}
      />

      <Modal
        open={isDialogOpen}
        onCancel={handleCloseDialog}
        title={editingFeature ? 'Изменить фичу' : 'Создать фичу'}
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
              placeholder="Название фичи"
              allowClear={!editingFeature}
              autoComplete="off"
              disabled={Boolean(editingFeature)}
            />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="Описание (необязательно)" rows={3} allowClear />
          </Form.Item>
          <Form.Item name="serviceIds" label="Услуги (необязательно)">
            <Checkbox.Group
              options={serviceCheckboxOptions}
              className="entity-modal-form__checkbox-group"
            />
          </Form.Item>
          <Form.Item className="entity-modal-form__footer">
            <Space className="entity-modal-form__actions">
              <Button onClick={handleCloseDialog}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                {editingFeature ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
