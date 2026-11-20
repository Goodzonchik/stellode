import { useState } from 'react';
import { Alert, Button, Modal, Select, Space, Typography } from 'antd';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { getErrorMessage } from '../../utils/axios-error';
import { buildRaiseFeatureComponentVersionBody } from './build-raise-feature-component-version-body';
import type { RaiseComponentVersionCandidate } from './filter-raise-component-version-candidates';
import './RaiseComponentVersionDialog.css';

type RaiseComponentVersionDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly featureVersionId: string | undefined;
  readonly fromComponentVersionId: string | undefined;
  readonly applicationId: string | undefined;
  readonly componentLabel: string;
  readonly candidates: readonly RaiseComponentVersionCandidate[];
  readonly onSuccess: () => void | Promise<void>;
};

export function RaiseComponentVersionDialog({
  isOpen,
  onClose,
  featureVersionId,
  fromComponentVersionId,
  applicationId,
  componentLabel,
  candidates,
  onSuccess,
}: RaiseComponentVersionDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(candidates[0]?.id);

  const submit = async () => {
    if (!featureVersionId || !fromComponentVersionId || !applicationId || !selectedId) return;
    setLoading(true);
    setError(null);
    try {
      await featureVersionsApi.raiseComponentVersion(
        buildRaiseFeatureComponentVersionBody(
          featureVersionId,
          fromComponentVersionId,
          applicationId,
          selectedId,
        ),
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
      title="Поднять версию"
      footer={null}
      destroyOnHidden
      afterOpenChange={(open) => {
        if (open) setSelectedId(candidates[0]?.id);
      }}
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
        Выберите новую версию для «{componentLabel}» в этом приложении. Исходящие зависимости для
        приложения будут выровнены; при необходимости поправьте их вручную.
      </Typography.Paragraph>
      <div className="entity-modal-form__field">
        <Select
          className="raise-component-version-dialog__select"
          value={selectedId}
          onChange={setSelectedId}
          options={candidates.map((row) => ({
            value: row.id,
            label: `${row.version} (${row.status})`,
          }))}
        />
      </div>

      <Space className="entity-modal-form__actions">
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button type="primary" loading={loading} onClick={() => void submit()} disabled={!selectedId}>
          Поднять
        </Button>
      </Space>
    </Modal>
  );
}
