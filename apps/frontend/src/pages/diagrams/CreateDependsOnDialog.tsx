import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Divider, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { applicationsApi } from '../../api/applications-api';
import { componentVersionsApi } from '../../api/component-versions-api';
import { edgeApi } from '../../api/edge-api';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { featuresApi } from '../../api/features-api';
import { servicesApi } from '../../api/services-api';
import type { ApplicationEntity, DependsOnContextDto } from '@stellode/models';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { getErrorMessageFromRequest } from '../../utils/axios-error';
import { shouldDisableEmptyOptionsSelect } from '../../utils/should-disable-empty-options-select';
import { ApplicationCreateDialog } from '../applications/ApplicationCreateDialog';
import type { DependsOnConnection } from './depends-on-connection';

export type DependsOnCvOption = { readonly id: string; readonly label: string };

export interface CreateDependsOnDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly connection: DependsOnConnection | null;
  readonly unitId: string | undefined;
  readonly onSuccess: () => void | Promise<void>;
  readonly providerCvOptions?: readonly DependsOnCvOption[];
}

type DependsOnFormValues = {
  consumerCvId: string;
  providerCvId: string;
  consumerServiceId: string;
  consumerApplicationId: string;
  consumerFeatureId: string;
  consumerFeatureVersionId: string;
  providerServiceId: string;
  providerApplicationId: string;
  providerFeatureId: string;
  providerFeatureVersionId: string;
};

type ServiceRow = { readonly id: string; readonly name: string };
type ApplicationRow = { readonly id: string; readonly name: string };
type FeatureRow = {
  readonly id: string;
  readonly name: string;
  readonly services?: ReadonlyArray<{ readonly id: string }>;
};
type FeatureVersionRow = {
  readonly id: string;
  readonly version?: unknown;
  readonly status?: string;
};

const featuresForService = (
  features: ReadonlyArray<FeatureRow>,
  serviceId: string | undefined,
): ReadonlyArray<FeatureRow> => {
  if (!serviceId) return [];
  return features.filter((f) => (f.services ?? []).some((s) => s.id === serviceId));
};

export function CreateDependsOnDialog({
  isOpen,
  onClose,
  connection,
  unitId,
  onSuccess,
  providerCvOptions,
}: CreateDependsOnDialogProps) {
  const { showToast } = useToast();
  const [form] = Form.useForm<DependsOnFormValues>();
  const [cvOptions, setCvOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [services, setServices] = useState<ReadonlyArray<ServiceRow>>([]);
  const [applications, setApplications] = useState<ReadonlyArray<ApplicationRow>>([]);
  const [features, setFeatures] = useState<ReadonlyArray<FeatureRow>>([]);
  const [consumerFeatureVersions, setConsumerFeatureVersions] = useState<
    ReadonlyArray<FeatureVersionRow>
  >([]);
  const [providerFeatureVersions, setProviderFeatureVersions] = useState<
    ReadonlyArray<FeatureVersionRow>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [createAppField, setCreateAppField] = useState<
    'consumerApplicationId' | 'providerApplicationId' | null
  >(null);

  const loadCatalogs = useCallback(async (tid: string) => {
    const [servicesData, applicationsData, featuresData] = await Promise.all([
      servicesApi.list(tid),
      applicationsApi.list(tid),
      featuresApi.list<FeatureRow>(tid),
    ]);
    setServices(Array.isArray(servicesData) ? servicesData : []);
    setApplications(Array.isArray(applicationsData) ? applicationsData : []);
    setFeatures(Array.isArray(featuresData) ? featuresData : []);
  }, []);

  useEffect(() => {
    if (!isOpen || !connection) return;
    setError(null);
    const hintFv =
      connection.consumerFeatureVersionIdHint ??
      (connection.contextHint?.nodeType === 'featureVersion'
        ? connection.contextHint.id
        : undefined);
    form.setFieldsValue({
      consumerCvId: connection.consumerComponentVersionId ?? '',
      providerCvId: connection.providerComponentVersionId ?? '',
      consumerFeatureVersionId: hintFv ?? '',
    });
  }, [isOpen, connection, form]);

  useEffect(() => {
    if (!isOpen || !unitId) return;
    void loadCatalogs(unitId).catch(() => {
      setServices([]);
      setApplications([]);
      setFeatures([]);
    });
  }, [isOpen, unitId, loadCatalogs]);

  useEffect(() => {
    if (!isOpen || !unitId) return;
    void componentVersionsApi
      .forUnit(unitId)
      .then((rows) => {
        const normalized = Array.isArray(rows) ? rows : [];
        const flat: Array<{ id: string; label: string }> = [];
        for (const row of normalized) {
          const comp = row?.component as { name?: string } | undefined;
          const versions = Array.isArray(row?.versions) ? row.versions : [];
          for (const v of versions) {
            if (v?.id && typeof v.id === 'string') {
              flat.push({
                id: v.id,
                label: `${comp?.name ?? '—'} v${v.version ?? ''} (${v.status ?? ''})`,
              });
            }
          }
        }
        setCvOptions(flat);
      })
      .catch(() => setCvOptions([]));
  }, [isOpen, unitId]);

  const consumerFeatureId = Form.useWatch('consumerFeatureId', form);
  const providerFeatureId = Form.useWatch('providerFeatureId', form);
  const consumerServiceId = Form.useWatch('consumerServiceId', form);
  const providerServiceId = Form.useWatch('providerServiceId', form);

  useEffect(() => {
    if (!isOpen || !consumerFeatureId) {
      setConsumerFeatureVersions([]);
      return;
    }
    void featureVersionsApi
      .list<FeatureVersionRow>(consumerFeatureId)
      .then((data) => setConsumerFeatureVersions(Array.isArray(data) ? data : []))
      .catch(() => setConsumerFeatureVersions([]));
  }, [isOpen, consumerFeatureId]);

  useEffect(() => {
    if (!isOpen || !providerFeatureId) {
      setProviderFeatureVersions([]);
      return;
    }
    void featureVersionsApi
      .list<FeatureVersionRow>(providerFeatureId)
      .then((data) => setProviderFeatureVersions(Array.isArray(data) ? data : []))
      .catch(() => setProviderFeatureVersions([]));
  }, [isOpen, providerFeatureId]);

  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: s.id, label: s.name })),
    [services],
  );
  const applicationOptions = useMemo(
    () => applications.map((a) => ({ value: a.id, label: a.name })),
    [applications],
  );
  const consumerFeatureOptions = useMemo(
    () =>
      featuresForService(features, consumerServiceId).map((f) => ({ value: f.id, label: f.name })),
    [features, consumerServiceId],
  );
  const providerFeatureOptions = useMemo(
    () =>
      featuresForService(features, providerServiceId).map((f) => ({ value: f.id, label: f.name })),
    [features, providerServiceId],
  );
  const consumerFvOptions = useMemo(
    () =>
      consumerFeatureVersions.map((fv) => ({
        value: fv.id,
        label: `v${String(fv.version ?? '')} (${String(fv.status ?? '')})`,
      })),
    [consumerFeatureVersions],
  );
  const providerFvOptions = useMemo(
    () =>
      providerFeatureVersions.map((fv) => ({
        value: fv.id,
        label: `v${String(fv.version ?? '')} (${String(fv.status ?? '')})`,
      })),
    [providerFeatureVersions],
  );

  const close = () => {
    form.resetFields();
    setError(null);
    setCreateAppField(null);
    onClose();
  };

  const onApplicationCreated = (application: ApplicationEntity) => {
    setApplications((prev) => [...prev, { id: application.id, name: application.name }]);
    if (createAppField) form.setFieldValue(createAppField, application.id);
    setCreateAppField(null);
  };

  const contextComplete = (values: DependsOnFormValues): DependsOnContextDto | null => {
    const ctx: DependsOnContextDto = {
      consumerServiceId: values.consumerServiceId?.trim(),
      consumerApplicationId: values.consumerApplicationId?.trim(),
      consumerFeatureId: values.consumerFeatureId?.trim(),
      consumerFeatureVersionId: values.consumerFeatureVersionId?.trim(),
      providerServiceId: values.providerServiceId?.trim(),
      providerApplicationId: values.providerApplicationId?.trim(),
      providerFeatureId: values.providerFeatureId?.trim(),
      providerFeatureVersionId: values.providerFeatureVersionId?.trim(),
    };
    const required = [
      ctx.consumerServiceId,
      ctx.consumerApplicationId,
      ctx.consumerFeatureId,
      ctx.consumerFeatureVersionId,
      ctx.providerServiceId,
      ctx.providerApplicationId,
      ctx.providerFeatureId,
      ctx.providerFeatureVersionId,
    ];
    if (required.some((v) => !v)) return null;
    return ctx;
  };

  const submit = async (values: DependsOnFormValues) => {
    setError(null);
    if (!connection) return setError('Нет данных соединения');
    const consumer = values.consumerCvId.trim();
    const provider = values.providerCvId.trim();
    if (!consumer) return setError('Выберите версию компонента-потребителя');
    if (!provider) return setError('Выберите версию компонента-поставщика');
    if (consumer === provider) {
      return setError('Потребитель и поставщик контракта должны быть разными версиями');
    }
    const context = contextComplete(values);
    if (!context) {
      return setError(
        'Заполните контекст consumer и provider: service, application, feature, feature version',
      );
    }
    try {
      await edgeApi.create({
        source: consumer,
        target: provider,
        context,
      });
      await Promise.resolve(onSuccess());
      showToast('Зависимость DEPENDS_ON создана', ToastVariant.Success);
      close();
    } catch (err: unknown) {
      const msg = getErrorMessageFromRequest(err, 'Не удалось создать DEPENDS_ON');

      setError(msg);
      showToast(msg, ToastVariant.Error);
    }
  };

  const needsPickConsumer = connection && connection.consumerComponentVersionId === null;
  const needsPickProvider = connection && connection.providerComponentVersionId === null;
  const selectCvOptions = cvOptions.map((o) => ({ value: o.id, label: o.label }));
  const selectProviderOptions = (
    providerCvOptions !== undefined
      ? providerCvOptions.map((o) => ({ value: o.id, label: o.label }))
      : selectCvOptions
  );
  const labelForCv = (id: string | undefined): string => {
    if (!id) return '—';
    const fromProvider = providerCvOptions?.find((o) => o.id === id)?.label;
    if (fromProvider) return fromProvider;
    return cvOptions.find((o) => o.id === id)?.label ?? id;
  };
  const fixedConsumerId = connection?.consumerComponentVersionId ?? undefined;
  const fixedConsumerLabel = labelForCv(fixedConsumerId);
  const fixedProviderId = connection?.providerComponentVersionId ?? undefined;
  const fixedProviderLabel = labelForCv(fixedProviderId);

  const requiredRule = { required: true, message: 'Обязательное поле' };

  const contextSideFields = (
    side: 'consumer' | 'provider',
    featureOptions: Array<{ value: string; label: string }>,
    fvOptions: Array<{ value: string; label: string }>,
  ) => (
    <>
      <Form.Item name={`${side}ServiceId`} label="Service" rules={[requiredRule]}>
        <Select
          placeholder="— выберите —"
          options={serviceOptions}
          showSearch
          optionFilterProp="label"
          allowClear
          onChange={() => form.setFieldValue(`${side}FeatureId`, undefined)}
        />
      </Form.Item>
      <div className="bind-application-pick">
        <Form.Item
          name={`${side}ApplicationId`}
          label="Application (родитель)"
          rules={[requiredRule]}
        >
          <Select
            placeholder="— выберите —"
            options={applicationOptions}
            disabled={shouldDisableEmptyOptionsSelect(applicationOptions.length)}
            showSearch
            optionFilterProp="label"
            allowClear
          />
        </Form.Item>
        <Button
          htmlType="button"
          onClick={() =>
            setCreateAppField(
              side === 'consumer' ? 'consumerApplicationId' : 'providerApplicationId',
            )
          }
        >
          Создать приложение
        </Button>
      </div>
      <Form.Item name={`${side}FeatureId`} label="Feature" rules={[requiredRule]}>
        <Select
          placeholder="— выберите —"
          options={featureOptions}
          showSearch
          optionFilterProp="label"
          allowClear
          disabled={!form.getFieldValue(`${side}ServiceId`)}
          onChange={() => form.setFieldValue(`${side}FeatureVersionId`, undefined)}
        />
      </Form.Item>
      <Form.Item name={`${side}FeatureVersionId`} label="FeatureVersion" rules={[requiredRule]}>
        <Select
          placeholder="— выберите —"
          options={fvOptions}
          showSearch
          optionFilterProp="label"
          allowClear
          disabled={!form.getFieldValue(`${side}FeatureId`)}
        />
      </Form.Item>
    </>
  );

  return (
    <>
    <Modal
      open={isOpen && createAppField === null}
      onCancel={close}
      title="Зависимость контракта (DEPENDS_ON)"
      footer={null}
      destroyOnHidden
      width={640}
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
      <Form<DependsOnFormValues> form={form} layout="vertical" onFinish={(v) => void submit(v)}>
        {needsPickConsumer ? (
          <Form.Item
            name="consumerCvId"
            label="Версия компонента-потребителя"
            rules={[{ required: true, message: 'Выберите версию' }]}
          >
            <Select
              placeholder="— выберите —"
              options={selectCvOptions}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item label="Потребитель (ComponentVersion)">
              <Typography.Text type="secondary">{fixedConsumerLabel}</Typography.Text>
            </Form.Item>
            <Form.Item name="consumerCvId" hidden>
              <Input />
            </Form.Item>
          </>
        )}
        {needsPickProvider ? (
          <Form.Item
            name="providerCvId"
            label="Версия компонента-поставщика"
            rules={[{ required: true, message: 'Выберите версию' }]}
          >
            <Select
              placeholder="— выберите —"
              options={selectProviderOptions}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item label="Поставщик (ComponentVersion)">
              <Typography.Text type="secondary">{fixedProviderLabel}</Typography.Text>
            </Form.Item>
            <Form.Item name="providerCvId" hidden>
              <Input />
            </Form.Item>
          </>
        )}

        <Divider orientation="left">Потребитель</Divider>
        {contextSideFields('consumer', consumerFeatureOptions, consumerFvOptions)}

        <Divider orientation="left">Поставщик</Divider>
        {contextSideFields('provider', providerFeatureOptions, providerFvOptions)}

        <Form.Item className="entity-modal-form__footer">
          <Space className="entity-modal-form__actions">
            <Button onClick={close}>Отмена</Button>
            <Button type="primary" htmlType="submit" disabled={!unitId}>
              Создать
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
    <ApplicationCreateDialog
      open={createAppField !== null}
      unitId={unitId}
      onCancel={() => setCreateAppField(null)}
      onCreated={onApplicationCreated}
    />
    </>
  );
}
