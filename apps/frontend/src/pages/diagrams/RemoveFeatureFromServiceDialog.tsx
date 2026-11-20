import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Space } from 'antd';
import { servicesApi } from '../../api/services-api';
import { getErrorMessage } from '../../utils/axios-error';

type RemoveFeatureFromServiceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string | undefined;
  featureId: string | undefined;
  featureName: string;
  onSuccess: () => void;
};

type RemoveFeatureFormValues = {
  reason: string;
};

export function RemoveFeatureFromServiceDialog({
  isOpen,
  onClose,
  serviceId,
  featureId,
  featureName,
  onSuccess,
}: RemoveFeatureFromServiceDialogProps) {
  const [form] = Form.useForm<RemoveFeatureFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({ reason: '' });
      setError(null);
    }
  }, [isOpen, form]);

  const submit = async (values: RemoveFeatureFormValues) => {
    if (!serviceId || !featureId) return;
    setLoading(true);
    setError(null);
    try {
      const trimmed = values.reason.trim();
      await servicesApi.removeAggregate(serviceId, {
        featureId,
        ...(trimmed ? { deletedReason: trimmed } : {}),
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onCancel={onClose} title="Снять фичу с услуги" footer={null} destroyOnHidden>
      {error && (
        <Alert type="error" title={error} showIcon className="entity-modal-form__alert" closable={{ onClose: () => setError(null) }} />
      )}
      <p>
        Фича <strong>{featureName}</strong> будет помечена как снятая с услуги (soft-delete ребра{' '}
        <code>AGGREGATES</code>).
      </p>
      <Form<RemoveFeatureFormValues> form={form} layout="vertical" onFinish={(v) => void submit(v)}>
        <Form.Item name="reason" label="Причина (необязательно)">
          <Input.TextArea rows={3} allowClear placeholder="Кратко укажите причину" />
        </Form.Item>
        <Form.Item className="entity-modal-form__footer">
          <Space className="entity-modal-form__actions">
            <Button onClick={onClose}>Отмена</Button>
            <Button danger type="primary" htmlType="submit" loading={loading}>
              Снять
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
