import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Space } from 'antd';
import { applicationVersionsApi } from '../../api/application-versions-api';
import type { ApplicationVersionRow } from '@stellode/models';
import { getErrorMessage } from '../../utils/axios-error';

type RenameApplicationVersionModalProps = {
  open: boolean;
  row: ApplicationVersionRow | null;
  onClose: () => void;
  onRenamed: () => void;
};

type RenameFormValues = {
  version: string;
};

export function RenameApplicationVersionModal(props: RenameApplicationVersionModalProps) {
  const [form] = Form.useForm<RenameFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!props.open || !props.row) return;
    form.setFieldsValue({ version: props.row.version });
    setError(null);
  }, [props.open, props.row, form]);

  const handleClose = () => {
    setError(null);
    props.onClose();
  };

  const handleSubmit = async (values: RenameFormValues) => {
    if (!props.row) return;
    const version = values.version.trim();
    setSubmitting(true);
    setError(null);
    try {
      await applicationVersionsApi.rename(props.row.id, { version });
      props.onRenamed();
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={props.open}
      onCancel={handleClose}
      title="Переименовать версию"
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
      <Form form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)}>
        <Form.Item
          name="version"
          label="Версия"
          rules={[
            {
              validator: async (_, value: string | undefined) => {
                if (!String(value ?? '').trim()) {
                  throw new Error('Укажите версию');
                }
              },
            },
          ]}
        >
          <Input placeholder="Версия релиза" autoComplete="off" />
        </Form.Item>
        <Form.Item className="entity-modal-form__footer">
          <Space className="entity-modal-form__actions">
            <Button onClick={handleClose}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Сохранить
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
