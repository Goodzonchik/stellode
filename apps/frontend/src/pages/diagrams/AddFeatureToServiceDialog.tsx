import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Select, Space } from 'antd';
import { featuresApi } from '../../api/features-api';
import { servicesApi } from '../../api/services-api';
import { getErrorMessage } from '../../utils/axios-error';

type ServiceRef = { id: string; name: string };

type FeatureRow = {
  id: string;
  name: string;
  services?: ServiceRef[];
};

type AddFeatureToServiceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  unitId: string | undefined;
  serviceId: string | undefined;
  onSuccess: () => void;
};

type AddFeatureFormValues = {
  featureId: string;
};

export function AddFeatureToServiceDialog({
  isOpen,
  onClose,
  unitId,
  serviceId,
  onSuccess,
}: AddFeatureToServiceDialogProps) {
  const [form] = Form.useForm<AddFeatureFormValues>();
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const available = useMemo(
    () =>
      serviceId ? features.filter((f) => !f.services?.some((s) => s.id === serviceId)) : [],
    [features, serviceId],
  );

  const load = useCallback(async () => {
    if (!unitId) return;
    setError(null);
    try {
      setFeatures(await featuresApi.list<FeatureRow>(unitId));
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  }, [unitId]);

  useEffect(() => {
    if (!isOpen) return;
    form.resetFields();
    void load();
  }, [isOpen, load, form]);

  const selectOptions = available.map((f) => ({ value: f.id, label: f.name }));

  const submit = async (values: AddFeatureFormValues) => {
    if (!serviceId || !values.featureId) return;
    setLoading(true);
    setError(null);
    try {
      await servicesApi.addAggregate(serviceId, { featureId: values.featureId });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onCancel={onClose} title="Добавить фичу в услугу" footer={null} destroyOnHidden>
      {error && (
        <Alert type="error" title={error} showIcon className="entity-modal-form__alert" closable={{ onClose: () => setError(null) }} />
      )}
      <Form<AddFeatureFormValues> form={form} layout="vertical" onFinish={(v) => void submit(v)}>
        <Form.Item
          name="featureId"
          label="Фича"
          rules={[{ required: true, message: 'Выберите фичу' }]}
        >
          <Select
            placeholder="— выберите —"
            options={selectOptions}
            disabled={!available.length}
            showSearch
            optionFilterProp="label"
            allowClear
        />
        </Form.Item>
        <Form.Item className="entity-modal-form__footer">
          <Space className="entity-modal-form__actions">
            <Button onClick={onClose}>Отмена</Button>
            <Button type="primary" htmlType="submit" disabled={loading || !available.length}>
              Добавить
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
