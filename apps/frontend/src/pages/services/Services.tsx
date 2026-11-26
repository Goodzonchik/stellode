import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Button, Form, Input, Modal, Space, Table, Tag } from 'antd';
import { featuresApi } from '../../api/features-api';
import { servicesApi } from '../../api/services-api';
import type { ColumnsType } from 'antd/es/table';
import { resolveUnitScopedHighlightMismatch } from '../../common/list-highlight/resolve-unit-scoped-highlight-mismatch';
import { useListRowHighlight } from '../../common/list-highlight/use-list-row-highlight';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { useCrudPageFeedback } from '../../hooks/useCrudPageFeedback';
import { useUnit } from '../../context/UnitContext';
import { useNavigate } from 'react-router-dom';
import { serviceSpaDiagramPath } from '../diagrams/spa-diagram-paths';
import { ManageServiceFeaturesDialog } from './ManageServiceFeaturesDialog';
import type {
  CreateServiceDto,
  FeatureWithServices,
  ServiceEntity,
  UpdateServiceDto,
} from '@stellode/models';

type FeatureRow = FeatureWithServices;

type ManageFeaturesTarget = {
  id: string;
  name: string;
};

type UnitListsPayload = {
  readonly services: ServiceEntity[];
  readonly features: FeatureRow[];
};

export function Services() {
  const { showToast } = useToast();
  const { error, setError, clearError, reportFormError, runListLoad } = useCrudPageFeedback();
  const { unit } = useUnit();
  const [services, setServices] = useState<ServiceEntity[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceEntity | null>(null);
  const [form] = Form.useForm<{ name: string; description: string }>();
  const [manageFeaturesTarget, setManageFeaturesTarget] = useState<ManageFeaturesTarget | null>(
    null,
  );
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [unarchiveTarget, setUnarchiveTarget] = useState<{ id: string; name: string } | null>(null);

  const unitId = unit?.id;
  const navigate = useNavigate();

  const isServiceArchived = (service: ServiceEntity): boolean => service.status === 'archive';

  const featuresByServiceId = useMemo(() => {
    const m = new Map<string, FeatureRow[]>();
    for (const f of features) {
      for (const s of f.services ?? []) {
        const list = m.get(s.id) ?? [];
        list.push(f);
        m.set(s.id, list);
      }
    }
    return m;
  }, [features]);

  const loadUnitLists = useCallback(async () => {
    if (!unitId) return;
    await runListLoad({
      load: async (): Promise<UnitListsPayload> => {
        const [servicesRows, featuresRows] = await Promise.all([
          servicesApi.list(unitId),
          featuresApi.list<FeatureRow>(unitId),
        ]);
        return { services: servicesRows, features: featuresRows };
      },
      onSuccess: (payload) => {
        setServices(payload.services);
        setFeatures(payload.features);
      },
      setRowsLoaded,
      logLabel: 'services/features',
    });
  }, [unitId, runListLoad]);

  useEffect(() => {
    if (!unitId) return;
    void loadUnitLists();
  }, [unitId, loadUnitLists]);

  const rowIds = useMemo(() => new Set(services.map((service) => service.id)), [services]);

  const onHighlightMismatch = useCallback(
    (payload: { highlightId: string; ctx: Readonly<Record<string, string>> }) => {
      resolveUnitScopedHighlightMismatch(payload, {
        currentUnitId: unitId,
        navigate,
        showToast,
        missingInUnitMessage: 'Услуга не найдена в текущем юните',
        otherUnitMessage: 'Услуга относится к другому юниту',
      });
    },
    [unitId, navigate, showToast],
  );

  const { rowClassName } = useListRowHighlight({
    rowsLoaded,
    rowIds,
    onMismatch: onHighlightMismatch,
  });

  const handleOpenDialog = (service?: ServiceEntity) => {
    if (service && isServiceArchived(service)) {
      return;
    }
    if (service) {
      setEditingService(service);
    } else {
      setEditingService(null);
    }
    setIsDialogOpen(true);
    clearError();
  };

  useEffect(() => {
    if (!isDialogOpen) return;
    form.setFieldsValue({
      name: editingService?.name || '',
      description: editingService?.description ?? '',
    });
  }, [isDialogOpen, editingService, form]);

  const handleCloseDialog = () => {
    form.resetFields();
    setIsDialogOpen(false);
    setEditingService(null);
    clearError();
  };

  const handleSubmit = async (values: { name: string; description: string }) => {
    clearError();

    const effectiveUnitId = unitId || '';
    if (!effectiveUnitId) {
      setError('Выберите основной юнит');
      return;
    }

    try {
      if (editingService) {
        const payload: UpdateServiceDto = {
          description: values.description || undefined,
        };
        await servicesApi.update(editingService.id, payload);
      } else {
        const payload: CreateServiceDto = {
          name: values.name,
          unitId: effectiveUnitId,
          description: values.description || undefined,
        };
        await servicesApi.create(payload);
      }
      handleCloseDialog();
      showToast('Услуга сохранена', ToastVariant.Success);
      void loadUnitLists();
    } catch (err: unknown) {
      reportFormError(err, 'Не удалось сохранить услуга');
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    clearError();
    try {
      await servicesApi.archive(archiveTarget.id);
      showToast('Услуга заархивирована', ToastVariant.Success);
      setArchiveTarget(null);
      void loadUnitLists();
    } catch (err: unknown) {
      reportFormError(err, 'Не удалось заархивировать услуга');
    }
  };

  const handleConfirmUnarchive = async () => {
    if (!unarchiveTarget) return;
    clearError();
    try {
      await servicesApi.unarchive(unarchiveTarget.id);
      showToast('Услуга возвращена из архива', ToastVariant.Success);
      setUnarchiveTarget(null);
      void loadUnitLists();
    } catch (err: unknown) {
      reportFormError(err, 'Не удалось вернуть услуга из архива');
    }
  };

  const columns: ColumnsType<ServiceEntity> = [
    {
      key: 'name',
      title: 'Название',
      dataIndex: 'name',
    },
    {
      key: 'description',
      title: 'Описание',
      render: (_, service) => service.description || '-',
    },
    {
      key: 'featureCount',
      title: 'Фичи',
      render: (_, service) => {
        const n = (featuresByServiceId.get(service.id) ?? []).length;
        return String(n);
      },
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, service) => {
        const archived = isServiceArchived(service);
        return (
          <div className="table-actions">
            {!archived ? (
              <Button
                htmlType="button"
                onClick={() =>
                  setManageFeaturesTarget({
                    id: service.id,
                    name: service.name || service.id,
                  })
                }
              >
                Управление фичами
              </Button>
            ) : null}
            <Button htmlType="button" onClick={() => navigate(serviceSpaDiagramPath(service.id))}>
              Диаграмма
            </Button>
            {!archived ? (
              <Button htmlType="button" onClick={() => handleOpenDialog(service)}>
                Изменить
              </Button>
            ) : null}
            {!archived ? (
              <Button
                htmlType="button"
                danger
                onClick={() => {
                  clearError();
                  setArchiveTarget({ id: service.id, name: service.name || service.id });
                }}
              >
                Архив
              </Button>
            ) : (
              <>
                <Tag>Архив</Tag>
                <Button
                  htmlType="button"
                  onClick={() => {
                    clearError();
                    setUnarchiveTarget({ id: service.id, name: service.name || service.id });
                  }}
                >
                  Вернуть из архива
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Услуги</h1>
        <Button htmlType="button" type="primary" onClick={() => handleOpenDialog()}>
          Создать услугу
        </Button>
      </header>

      <Table<ServiceEntity>
        columns={columns}
        dataSource={services}
        rowKey={(service) => service.id}
        rowClassName={(service) => rowClassName(service.id)}
        pagination={false}
      />

      <Modal
        open={isDialogOpen}
        onCancel={handleCloseDialog}
        title={editingService ? 'Изменить услугу' : 'Создать услугу'}
        footer={null}
        destroyOnHidden
      >
        {error && (
          <Alert
            type="error"
            title={error}
            showIcon
            className="entity-modal-form__alert"
            closable={{ onClose: clearError }}
          />
        )}
        <Form form={form} layout="vertical" onFinish={(v) => void handleSubmit(v)}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input
              placeholder="Название услугаа"
              allowClear={!editingService}
              autoComplete="off"
              disabled={Boolean(editingService)}
            />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="Описание (необязательно)" rows={3} allowClear />
          </Form.Item>
          <Form.Item className="entity-modal-form__footer">
            <Space className="entity-modal-form__actions">
              <Button onClick={handleCloseDialog}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                {editingService ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <ManageServiceFeaturesDialog
        isOpen={manageFeaturesTarget !== null}
        onClose={() => setManageFeaturesTarget(null)}
        unitId={unitId}
        serviceId={manageFeaturesTarget?.id}
        serviceName={manageFeaturesTarget?.name ?? ''}
        onSuccess={(kind) => {
          showToast(
            kind === 'add' ? 'Фича добавлена в услугу' : 'Фича снята с услуги',
            ToastVariant.Success,
          );
          void loadUnitLists();
        }}
      />

      <Modal
        open={archiveTarget !== null}
        onCancel={() => {
          setArchiveTarget(null);
          clearError();
        }}
        title="Архивировать услуга"
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setArchiveTarget(null);
              clearError();
            }}
          >
            Отмена
          </Button>,
          <Button key="archive" danger type="primary" onClick={() => void handleConfirmArchive()}>
            Заархивировать
          </Button>,
        ]}
      >
        {error ? (
          <Alert
            type="error"
            title={error}
            showIcon
            className="entity-modal-form__alert"
            closable={{ onClose: clearError }}
          />
        ) : null}
        <p>
          Вы точно хотите заархивировать услуга «{archiveTarget?.name ?? ''}»? Изменение состава
          услуги и описания после этого будет недоступно.
        </p>
      </Modal>

      <Modal
        open={unarchiveTarget !== null}
        onCancel={() => {
          setUnarchiveTarget(null);
          clearError();
        }}
        title="Вернуть услуга из архива"
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setUnarchiveTarget(null);
              clearError();
            }}
          >
            Отмена
          </Button>,
          <Button key="unarchive" type="primary" onClick={() => void handleConfirmUnarchive()}>
            Вернуть из архива
          </Button>,
        ]}
      >
        {error ? (
          <Alert
            type="error"
            title={error}
            showIcon
            className="entity-modal-form__alert"
            closable={{ onClose: clearError }}
          />
        ) : null}
        <p>
          Вернуть услуга «{unarchiveTarget?.name ?? ''}» из архива? Снова станут доступны изменение
          описания и управление фичами в составе услуги.
        </p>
      </Modal>
    </section>
  );
}
