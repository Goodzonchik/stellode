import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Modal, Select, Space, Typography } from 'antd';
import { edgeApi } from '../../api/edge-api';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { getErrorMessageFromRequest } from '../../utils/axios-error';
import { buildSameFeatureDependsOnDto } from './build-same-feature-depends-on-dto';
import type { FeatureVersionUsesCvOption } from './collect-feature-version-uses-cv-options';

export type AddFeatureDependsOnDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly featureVersionId: string | undefined;
  readonly consumerCvId: string | undefined;
  readonly consumerApplicationId: string | undefined;
  readonly consumerLabel: string;
  readonly fixedProviderCvId?: string;
  readonly fixedProviderApplicationId?: string;
  readonly fixedProviderLabel?: string;
  readonly providerOptions: readonly FeatureVersionUsesCvOption[];
  readonly onSuccess: () => void | Promise<void>;
};

type ProviderSelectValue = string;

const optionKey = (cvId: string, applicationId: string): string =>
  `${cvId}::${applicationId}`;

const parseOptionKey = (
  value: string,
): { readonly cvId: string; readonly applicationId: string } | null => {
  const sep = value.indexOf('::');
  if (sep <= 0 || sep >= value.length - 2) return null;
  return { cvId: value.slice(0, sep), applicationId: value.slice(sep + 2) };
};

export function AddFeatureDependsOnDialog({
  isOpen,
  onClose,
  featureVersionId,
  consumerCvId,
  consumerApplicationId,
  consumerLabel,
  fixedProviderCvId,
  fixedProviderApplicationId,
  fixedProviderLabel,
  providerOptions,
  onSuccess,
}: AddFeatureDependsOnDialogProps) {
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerKey, setProviderKey] = useState<ProviderSelectValue | undefined>(undefined);

  const providerFixed =
    fixedProviderCvId !== undefined &&
    fixedProviderCvId.trim().length > 0 &&
    fixedProviderApplicationId !== undefined &&
    fixedProviderApplicationId.trim().length > 0;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (providerFixed) {
      setProviderKey(optionKey(fixedProviderCvId, fixedProviderApplicationId));
      return;
    }
    setProviderKey(undefined);
  }, [isOpen, providerFixed, fixedProviderCvId, fixedProviderApplicationId]);

  const selectOptions = useMemo(
    () =>
      providerOptions.map((o) => ({
        value: optionKey(o.id, o.applicationId),
        label: o.label,
      })),
    [providerOptions],
  );

  const close = () => {
    setError(null);
    setProviderKey(undefined);
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!featureVersionId?.trim() || !consumerCvId?.trim() || !consumerApplicationId?.trim()) {
      setError('Не задан контекст потребителя');
      return;
    }
    const parsed = providerKey !== undefined ? parseOptionKey(providerKey) : null;
    if (parsed === null) {
      setError('Выберите компонент-поставщик');
      return;
    }
    if (parsed.cvId === consumerCvId) {
      setError('Потребитель и поставщик должны быть разными версиями');
      return;
    }
    setLoading(true);
    try {
      await edgeApi.createDependsOnFromFeatureVersions(
        buildSameFeatureDependsOnDto({
          featureVersionId,
          consumerCvId,
          consumerApplicationId,
          providerCvId: parsed.cvId,
          providerApplicationId: parsed.applicationId,
        }),
      );
      await Promise.resolve(onSuccess());
      showToast('Связь DEPENDS_ON создана', ToastVariant.Success);
      close();
    } catch (err: unknown) {
      const msg = getErrorMessageFromRequest(err, 'Не удалось создать DEPENDS_ON');
      setError(msg);
      showToast(msg, ToastVariant.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onCancel={close} title="Добавить связь" footer={null} destroyOnHidden>
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
        Потребитель: <Typography.Text strong>{consumerLabel}</Typography.Text>
      </Typography.Paragraph>
      {providerFixed ? (
        <Typography.Paragraph>
          Поставщик:{' '}
          <Typography.Text strong>
            {fixedProviderLabel ?? fixedProviderCvId ?? '—'}
          </Typography.Text>
        </Typography.Paragraph>
      ) : (
        <Select
          className="bind-application-pick__select"
          placeholder="Компонент или dependency из состава фичи"
          options={selectOptions}
          value={providerKey}
          onChange={(value: string) => setProviderKey(value)}
          showSearch
          optionFilterProp="label"
          allowClear
        />
      )}
      <Space className="entity-modal-form__actions">
        <Button onClick={close} disabled={loading}>
          Отмена
        </Button>
        <Button type="primary" loading={loading} onClick={() => void submit()}>
          Создать
        </Button>
      </Space>
    </Modal>
  );
}
