import { Alert, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import {
  VersionStatus,
  type CheckFeatureVersionReadyResult,
  type FeatureBindingReadiness,
} from '@stellode/models';
import { featureBindingReadinessReasonLabel } from '../pages/feature-versions/feature-binding-readiness-reason-label';
import {
  featureReadinessApplicationPath,
  featureReadinessComponentPath,
} from '../pages/feature-versions/feature-readiness-row-links';
import { filterNotReadyBindings } from '../pages/feature-versions/filter-not-ready-bindings';
import { sortFeatureBindingReadiness } from '../pages/feature-versions/sort-feature-binding-readiness';
import './FeatureReadinessModal.css';

export type FeatureReadinessModalProps = {
  readonly isOpen: boolean;
  readonly result: CheckFeatureVersionReadyResult | null;
  readonly onClose: () => void;
};

const statusInReleaseLabel = (status: FeatureBindingReadiness['statusInRelease']): string =>
  status === null ? 'нет в релизе' : status;

const columns: ColumnsType<FeatureBindingReadiness> = [
  {
    key: 'application',
    title: 'Приложение',
    render: (_, row) => (
      <Link to={featureReadinessApplicationPath(row.applicationId, row.unitId)}>
        {row.applicationName || row.applicationId || '—'}
      </Link>
    ),
  },
  {
    key: 'component',
    title: 'Компонент',
    render: (_, row) => (
      <Link to={featureReadinessComponentPath(row.componentId, row.unitId)}>
        {row.componentName || row.componentId || '—'}
      </Link>
    ),
  },
  {
    key: 'version',
    title: 'Версия',
    render: (_, row) => row.componentVersion || '—',
  },
  {
    key: 'statusInRelease',
    title: 'Статус в релизе',
    render: (_, row) => (
      <Tag color={row.ready ? 'success' : 'warning'}>{statusInReleaseLabel(row.statusInRelease)}</Tag>
    ),
  },
  {
    key: 'reason',
    title: 'Причина',
    render: (_, row) => featureBindingReadinessReasonLabel(row.reason),
  },
];

export const FeatureReadinessModal = ({
  isOpen,
  result,
  onClose,
}: FeatureReadinessModalProps) => {
  const hasNoBindings = result ? result.bindings.length === 0 : false;
  const notReadyBindings = result
    ? sortFeatureBindingReadiness(filterNotReadyBindings(result.bindings))
    : [];
  const notReadyCrossUnitBindings = result
    ? sortFeatureBindingReadiness(filterNotReadyBindings(result.crossUnitBindings))
    : [];
  const isAutoPublished = result?.featureVersion.status === VersionStatus.Active;
  const isReady = result?.readyToProduction === true;
  const alertType = isAutoPublished || isReady ? 'success' : 'warning';
  const alertMessage = isAutoPublished
    ? 'Версия автоматически опубликована'
    : isReady
      ? 'Все привязки готовы к публикации'
      : hasNoBindings
        ? 'Нет связанных компонентов'
        : 'Есть привязки, не готовые к публикации';
  const showDetails = !isAutoPublished && !isReady && !hasNoBindings;
  const showLocalTable = showDetails && notReadyBindings.length > 0;
  const showCrossUnitTable = showDetails && notReadyCrossUnitBindings.length > 0;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Проверка готовности фичи"
      footer={null}
      width={800}
    >
      {result ? (
        <>
          <Alert
            className="feature-readiness-modal__alert"
            type={alertType}
            title={alertMessage}
            showIcon
          />
          {hasNoBindings ? (
            <p className="feature-readiness-modal__empty">Нет связанных компонентов</p>
          ) : null}
          {showLocalTable ? (
            <Table<FeatureBindingReadiness>
              columns={columns}
              dataSource={[...notReadyBindings]}
              rowKey={(row) => `${row.applicationId}::${row.componentVersionId}`}
              pagination={false}
              size="small"
            />
          ) : null}
          {showCrossUnitTable ? (
            <section className="feature-readiness-modal__cross-unit">
              <h3 className="feature-readiness-modal__cross-unit-title">Другой юнит</h3>
              <Table<FeatureBindingReadiness>
                columns={columns}
                dataSource={[...notReadyCrossUnitBindings]}
                rowKey={(row) =>
                  `cross::${row.applicationId}::${row.componentVersionId}`
                }
                pagination={false}
                size="small"
              />
            </section>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
};
