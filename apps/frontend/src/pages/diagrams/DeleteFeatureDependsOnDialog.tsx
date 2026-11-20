import { useState } from 'react';
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { edgeApi } from '../../api/edge-api';
import { getErrorMessage } from '../../utils/axios-error';
import { buildDeleteFeatureDependsOnDto } from './build-delete-feature-depends-on-dto';

type DeleteFeatureDependsOnDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly featureVersionId: string | undefined;
  readonly sourceComponentVersionId: string | undefined;
  readonly targetComponentVersionId: string | undefined;
  readonly consumerApplicationId: string | undefined;
  readonly providerApplicationId: string | undefined;
  readonly edgeLabel: string;
  readonly onSuccess: () => void | Promise<void>;
};

export function DeleteFeatureDependsOnDialog({
  isOpen,
  onClose,
  featureVersionId,
  sourceComponentVersionId,
  targetComponentVersionId,
  consumerApplicationId,
  providerApplicationId,
  edgeLabel,
  onSuccess,
}: DeleteFeatureDependsOnDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (
      !featureVersionId ||
      !sourceComponentVersionId ||
      !targetComponentVersionId ||
      !consumerApplicationId ||
      !providerApplicationId
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await edgeApi.deleteDependsOn(
        buildDeleteFeatureDependsOnDto({
          featureVersionId,
          sourceComponentVersionId,
          targetComponentVersionId,
          consumerApplicationId,
          providerApplicationId,
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
    <Modal open={isOpen} onCancel={onClose} title="Удалить связь" footer={null} destroyOnHidden>
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
        Удалить зависимость «{edgeLabel}» из черновика фичи? Исторические копии в других версиях не
        изменятся.
      </Typography.Paragraph>
      <Space className="entity-modal-form__actions">
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button type="primary" danger loading={loading} onClick={() => void submit()}>
          Удалить
        </Button>
      </Space>
    </Modal>
  );
}
