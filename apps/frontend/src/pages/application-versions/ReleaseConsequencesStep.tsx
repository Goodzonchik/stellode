import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Space, Spin } from 'antd';
import { applicationVersionsApi } from '../../api/application-versions-api';
import {
  ReleasePreviewMode,
  type ReleasePreviewResponse,
  type ReleaseComponentSelectionDto,
} from '@stellode/models';
import { ReleasePreviewContent } from './ReleasePreviewContent';
import { ToastVariant, useToast } from '../../hooks/useToast';
import styles from './ReleaseWizardForm.module.css';

const readMessage = (errorValue: unknown): string | undefined =>
  errorValue && typeof errorValue === 'object' && 'response' in errorValue
    ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;

export type ReleaseConsequencesStepProps = {
  applicationId: string;
  sourceApplicationVersionId: string | null;
  components: ReleaseComponentSelectionDto[];
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
};

export function ReleaseConsequencesStep(props: ReleaseConsequencesStepProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ReleasePreviewResponse | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setAcknowledged(false);
    const run = async () => {
      setLoading(true);
      try {
        const payload: {
          applicationId: string;
          mode: typeof ReleasePreviewMode.Release;
          sourceApplicationVersionId?: string;
          components: ReleaseComponentSelectionDto[];
        } = {
          applicationId: props.applicationId,
          mode: ReleasePreviewMode.Release,
          components: props.components,
        };
        if (props.sourceApplicationVersionId) {
          payload.sourceApplicationVersionId = props.sourceApplicationVersionId;
        }
        const previewData = await applicationVersionsApi.releasePreview(payload);
        setPreview(previewData);
      } catch (errorValue: unknown) {
        showToast(
          readMessage(errorValue) || 'Не удалось загрузить предпросмотр последствий',
          ToastVariant.Error,
        );
        setPreview(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [props.applicationId, props.components, props.sourceApplicationVersionId, showToast]);

  const requiresAcknowledgement = useMemo(() => {
    if (!preview) return false;
    return preview.inThisApplication.length > 0 || preview.global.length > 0;
  }, [preview]);

  const canProceed = !requiresAcknowledgement || acknowledged;

  return (
    <>
      <p className={styles.stepDescription}>
        Шаг 2: последствия релиза для фич, зависимостей и глобальных статусов версий компонентов.
      </p>
      {loading ? (
        <Spin aria-label="Загрузка предпросмотра" />
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
      <Space className="entity-modal-form__actions">
        <Button htmlType="button" onClick={props.onBack}>
          Назад
        </Button>
        <Button htmlType="button" onClick={props.onCancel}>
          Отмена
        </Button>
        <Button htmlType="button" type="primary" disabled={!canProceed || loading} onClick={props.onNext}>
          Далее
        </Button>
      </Space>
    </>
  );
}
