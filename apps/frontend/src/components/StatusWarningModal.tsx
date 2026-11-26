import { useEffect, useState } from 'react';
import { Button, Collapse, Modal, Spin, Typography } from 'antd';
import { statusWarningApi } from '../api/status-warning-api';
import type {
  ComponentVersionStatusWarning,
  StatusWarningCandidate,
} from '@stellode/models';
import { getErrorMessage } from '../utils/axios-error';
import { ToastVariant, useToast } from '../hooks/useToast';
import './StatusWarningModal.css';

type ModalTarget =
  | { readonly kind: 'componentVersion'; readonly componentVersionId: string }
  | { readonly kind: 'application'; readonly applicationId: string };

type StatusWarningModalProps = {
  readonly target: ModalTarget | null;
  readonly onClose: () => void;
};

const emptyMainLabel = (label: string): string => `Нет связанных ${label}`;

const renderNameList = (names: readonly string[]) => (
  <ul className="status-warning-modal__list">
    {names.map((name) => (
      <li key={name} className="status-warning-modal__list-item">
        {name}
      </li>
    ))}
  </ul>
);

export const StatusWarningModal = (props: StatusWarningModalProps) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<'candidates' | 'details'>('details');
  const [candidates, setCandidates] = useState<StatusWarningCandidate[]>([]);
  const [details, setDetails] = useState<ComponentVersionStatusWarning | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (props.target === null) {
      setCandidates([]);
      setDetails(null);
      setStep('details');
      return;
    }
    const target = props.target;
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setDetails(null);
      setCandidates([]);
      try {
        if (target.kind === 'componentVersion') {
          setStep('details');
          const warning = await statusWarningApi.componentVersionWarning(
            target.componentVersionId,
          );
          if (!cancelled) setDetails(warning);
          return;
        }
        const rows = await statusWarningApi.applicationCandidates(target.applicationId);
        if (cancelled) return;
        setCandidates(rows);
        if (rows.length === 1) {
          setStep('details');
          const warning = await statusWarningApi.componentVersionWarning(
            rows[0].componentVersionId,
          );
          if (!cancelled) setDetails(warning);
          return;
        }
        setStep('candidates');
      } catch (error: unknown) {
        if (cancelled) return;
        showToast(
          getErrorMessage(error, 'Не удалось загрузить предупреждение'),
          ToastVariant.Error,
        );
        props.onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [props.target, props.onClose, showToast]);

  const selectCandidate = async (candidate: StatusWarningCandidate): Promise<void> => {
    setLoading(true);
    try {
      const warning = await statusWarningApi.componentVersionWarning(candidate.componentVersionId);
      setDetails(warning);
      setStep('details');
    } catch (error: unknown) {
      showToast(
        getErrorMessage(error, 'Не удалось загрузить предупреждение'),
        ToastVariant.Error,
      );
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === 'candidates'
      ? 'Компоненты с предупреждением'
      : details
        ? `${details.componentName} · ${details.version} (${details.status})`
        : 'Предупреждение';

  const collapseItems = details
    ? [
        details.components.length > 0
          ? {
              key: 'components',
              label: 'Компоненты',
              children: (
                <ul className="status-warning-modal__list">
                  {details.components.map((item) => (
                    <li
                      key={`${item.componentName}-${item.version}-${item.direction}`}
                      className="status-warning-modal__list-item"
                    >
                      {item.componentName} · {item.version} ({item.status}) —{' '}
                      {item.direction === 'incoming' ? 'входящая' : 'исходящая'}
                    </li>
                  ))}
                </ul>
              ),
            }
          : null,
        details.features.length > 0
          ? {
              key: 'features',
              label: 'Фичи',
              children: (
                <ul className="status-warning-modal__list">
                  {details.features.map((item) => (
                    <li
                      key={`${item.name}-${item.version}`}
                      className="status-warning-modal__list-item"
                    >
                      {item.name} · {item.version} ({item.status})
                    </li>
                  ))}
                </ul>
              ),
            }
          : null,
        details.services.length > 0
          ? {
              key: 'services',
              label: 'Услуги',
              children: renderNameList(details.services.map((item) => item.name)),
            }
          : null,
      ].filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  return (
    <Modal
      open={props.target !== null}
      title={title}
      onCancel={props.onClose}
      footer={[
        step === 'details' && candidates.length > 1 ? (
          <Button key="back" onClick={() => setStep('candidates')}>
            Назад
          </Button>
        ) : null,
        <Button key="close" type="primary" onClick={props.onClose}>
          Закрыть
        </Button>,
      ].filter(Boolean)}
      destroyOnHidden
      width={640}
    >
      {loading ? (
        <div className="status-warning-modal__loading">
          <Spin />
        </div>
      ) : null}
      {!loading && step === 'candidates' ? (
        candidates.length === 0 ? (
          <p className="status-warning-modal__empty">Нет кандидатов</p>
        ) : (
          <ul className="status-warning-modal__list">
            {candidates.map((item) => (
              <li
                key={item.componentVersionId}
                className="status-warning-modal__list-item"
              >
                <span>
                  {item.componentName} · {item.version} ({item.status})
                </span>
                <Button type="link" onClick={() => void selectCandidate(item)}>
                  Открыть
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {!loading && step === 'details' && details ? (
        <div className="status-warning-modal__details">
          <Typography.Title level={5}>Приложения</Typography.Title>
          {details.applications.length === 0 ? (
            <Typography.Text type="secondary">{emptyMainLabel('приложений')}</Typography.Text>
          ) : (
            renderNameList(details.applications.map((item) => item.name))
          )}
          <Typography.Title level={5}>Команды</Typography.Title>
          {details.teams.length === 0 ? (
            <Typography.Text type="secondary">{emptyMainLabel('команд')}</Typography.Text>
          ) : (
            renderNameList(details.teams.map((item) => item.name))
          )}
          {collapseItems.length > 0 ? (
            <Collapse className="status-warning-modal__collapse" items={collapseItems} />
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};
