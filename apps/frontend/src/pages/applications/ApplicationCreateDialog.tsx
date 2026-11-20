import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Space } from 'antd';
import { applicationsApi } from '../../api/applications-api';
import type { ApplicationEntity, CreateApplicationDto } from '@stellode/models';
import { getErrorMessageFromRequest } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';

export type ApplicationCreateDialogProps = {
  readonly open: boolean;
  readonly unitId: string | undefined;
  readonly onCancel: () => void;
  readonly onCreated: (application: ApplicationEntity) => void;
};

type FormValues = { name: string; description: string };

export function ApplicationCreateDialog({
  open,
  unitId,
  onCancel,
  onCreated,
}: ApplicationCreateDialogProps) {
  const { showToast } = useToast();
  const [form] = Form.useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setError(null);
  }, [open, form]);

  const close = () => {
    form.resetFields();
    setError(null);
    onCancel();
  };

  const submit = async (values: FormValues) => {
    setError(null);
    if (!unitId) {
      setError('Выберите юнит');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateApplicationDto = {
        name: values.name,
        unitId,
        description: values.description || undefined,
      };
      const created = await applicationsApi.create(payload);
      if (!created?.id) {
        setError('Приложение создано без id');
        return;
      }
      showToast('Приложение сохранено', ToastVariant.Success);
      form.resetFields();
      onCreated(created);
    } catch (err: unknown) {
      const messageText = getErrorMessageFromRequest(err, 'Не удалось сохранить приложение');
      setError(messageText);
      showToast(messageText, ToastVariant.Error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title="Создать приложение"
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
      <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, message: 'Укажите название' }]}
        >
          <Input placeholder="Название приложения" allowClear autoComplete="off" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea placeholder="Описание (необязательно)" rows={3} allowClear />
        </Form.Item>
        <Form.Item className="entity-modal-form__footer">
          <Space className="entity-modal-form__actions">
            <Button onClick={close}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Создать
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
