import { useState } from 'react';
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { getErrorMessage } from '../../utils/axios-error';
import { buildBindFeatureComponentVersionsRemoveBody } from './build-bind-feature-component-versions-remove-body';

type ExcludeComponentFromFeatureDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly featureVersionId: string | undefined;
  readonly componentVersionId: string | undefined;
  readonly applicationId: string | undefined;
  readonly componentLabel: string;
  readonly onSuccess: () => void | Promise<void>;
};

export function ExcludeComponentFromFeatureDialog({
  isOpen,
  onClose,
  featureVersionId,
  componentVersionId,
  applicationId,
  componentLabel,
  onSuccess,
}: ExcludeComponentFromFeatureDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!featureVersionId || !componentVersionId || !applicationId) return;
    setLoading(true);
    setError(null);
    try {
      await featureVersionsApi.bindComponentVersions(
        buildBindFeatureComponentVersionsRemoveBody(featureVersionId, {
          componentVersionId,
          applicationId,
        }),
      );
      await Promise.resolve(onSuccess());
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Исключить из фичи"
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
      <Typography.Paragraph>
        Убрать «{componentLabel}» из состава черновика? После публикации версии компонент не
        наследуется в следующие draft.
      </Typography.Paragraph>
      <Space className="entity-modal-form__actions">
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button type="primary" danger loading={loading} onClick={() => void submit()}>
          Исключить
        </Button>
      </Space>
    </Modal>
  );
}
