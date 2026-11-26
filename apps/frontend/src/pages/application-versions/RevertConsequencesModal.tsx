import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Modal, Spin } from 'antd';
import { applicationVersionsApi } from '../../api/application-versions-api';
import {
  ReleasePreviewMode,
  type ReleasePreviewResponse,
} from '@stellode/models';
import { getErrorMessage } from '../../utils/axios-error';
import { ReleasePreviewContent } from './ReleasePreviewContent';

export type RevertConsequencesModalProps = {
  open: boolean;
  applicationId: string;
  sourceApplicationVersionId: string;
  onClose: () => void;
  onReverted: () => void;
};

export function RevertConsequencesModal(props: RevertConsequencesModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReleasePreviewResponse | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setAcknowledged(false);
    setError(null);
    setPreview(null);
    const run = async () => {
      setLoading(true);
      try {
        const previewData = await applicationVersionsApi.releasePreview({
          applicationId: props.applicationId,
          mode: ReleasePreviewMode.Revert,
          sourceApplicationVersionId: props.sourceApplicationVersionId,
        });
        setPreview(previewData);
      } catch (errorValue: unknown) {
        setError(getErrorMessage(errorValue, 'Не удалось загрузить последствия отката'));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [props.open, props.applicationId, props.sourceApplicationVersionId]);

  const requiresAcknowledgement = useMemo(() => {
    if (!preview) return false;
    return preview.inThisApplication.length > 0 || preview.global.length > 0;
  }, [preview]);

  const canSubmit = !requiresAcknowledgement || acknowledged;

  const submitRevert = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await applicationVersionsApi.revert({
        applicationId: props.applicationId,
        sourceApplicationVersionId: props.sourceApplicationVersionId,
      });
      props.onReverted();
      props.onClose();
    } catch (errorValue: unknown) {
      setError(getErrorMessage(errorValue, 'Не удалось выполнить откат'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={props.open}
      title="Откат к предыдущему релизу"
      onCancel={props.onClose}
      footer={[
        <Button key="cancel" htmlType="button" onClick={props.onClose}>
          Отмена
        </Button>,
        <Button
          key="revert"
          htmlType="button"
          type="primary"
          loading={submitting}
          disabled={!canSubmit || loading}
          onClick={() => void submitRevert()}
        >
          Выполнить откат
        </Button>,
      ]}
    >
      <p>
        Будет создана новая текущая версия приложения с составом предыдущего релиза; глобальные
        статусы компонентов пересчитаются.
      </p>
      {error ? (
        <Alert
          type="error"
          title={error}
          showIcon
          className="entity-modal-form__alert"
          closable={{ onClose: () => setError(null) }}
        />
      ) : null}
      {loading ? (
        <Spin aria-label="Загрузка последствий отката" />
      ) : preview ? (
        <ReleasePreviewContent
          inThisApplication={preview.inThisApplication}
          global={preview.global}
          globalStatusChanges={preview.globalStatusChanges}
        />
      ) : null}
      {requiresAcknowledgement ? (
        <Checkbox checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)}>
          Я понимаю последствия
        </Checkbox>
      ) : null}
    </Modal>
  );
}
