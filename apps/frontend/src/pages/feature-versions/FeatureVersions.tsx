import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { impactApi } from '../../api/impact-api';
import { Button, Input, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FeatureReadinessModal } from '../../components/FeatureReadinessModal';
import { ImpactConfirmDialog } from '../../components/ImpactConfirmDialog';
import { VersionLifecycleStatusTag } from '../../components/VersionLifecycleStatusTag';
import { getErrorMessage } from '../../utils/axios-error';
import { featureVersionNeedsCriticalConfirm } from '../../utils/version-transition-guard';
import { useFeatureVersionReadinessCheck } from '../../hooks/useFeatureVersionReadinessCheck';
import { ToastVariant, useToast } from '../../hooks/useToast';
import {
  allowedTargetsFeatureVersion,
  parseVersionStatus,
  suggestNextComponentOrFeatureVersionString,
  VersionStatus as VersionStatusConst,
  type FeatureVersionListItem,
  type ImpactAnalysisResult,
  type VersionStatus,
} from '@stellode/models';
import { featureVersionDiagramPath } from '../diagrams/spa-diagram-paths';
import { filterFeatureVersionTransitionTargets } from './filter-feature-version-transition-targets';
import { formatBlockingRelationLine } from './format-blocking-relation-line';
import type { FeatureVersionBlockingRelation } from './feature-version-blocking-relation';
import { isEmptyFeatureDraftPublishBlocked } from './is-empty-feature-draft-publish-blocked';
import { parseFeatureVersionDeletionBlocked } from './parse-feature-version-deletion-blocked';

type Feature = FeatureVersionListItem;

const formatRelationCount = (count: number | undefined): string | number => {
  const value = count ?? 0;
  return value > 0 ? value : '—';};

const featureVersionTransitionLabel = (target: VersionStatus): string => {
  if (target === VersionStatusConst.Active) return 'Активировать';
  if (target === VersionStatusConst.Unactive) return 'Деактивировать';
  return target;
};

export function FeatureVersions() {
  const { showToast } = useToast();
  const [features, setFeatures] = useState<Feature[]>([]);

  const [criticalOpen, setCriticalOpen] = useState(false);
  const [criticalLoading, setCriticalLoading] = useState(false);
  const [impactData, setImpactData] = useState<ImpactAnalysisResult | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{
    feature: Feature;
    target: VersionStatus;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createVersion, setCreateVersion] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteBlocking, setDeleteBlocking] = useState<
    readonly FeatureVersionBlockingRelation[] | null
  >(null);

  const featureElementId = useParams().id;
  const navigate = useNavigate();

  const maxDraftVersionNumber = useMemo(() => {
    const nums = features
      .filter((f) => f.status === VersionStatusConst.Draft)
      .map((f) => Number(f.versionNumber ?? 0));
    return nums.length ? Math.max(...nums) : -1;
  }, [features]);

  const suggestedVersion = useMemo(() => {
    const nums = features.map((feature) => Number(feature.versionNumber ?? -1));
    const maxNum = nums.length ? Math.max(...nums) : null;
    return suggestNextComponentOrFeatureVersionString(
      maxNum === null || Number.isNaN(maxNum) ? null : maxNum,
    );
  }, [features]);

  useEffect(() => {
    if (!featureElementId) return;
    loadFeatures();
  }, [featureElementId]);

  const loadFeatures = async () => {
    if (!featureElementId) return;
    try {
      const data = await featureVersionsApi.list<Feature>(featureElementId);
      setFeatures(data);
    } catch (err) {
      console.error('Error loading features:', err);
      showToast(getErrorMessage(err), ToastVariant.Error);
    }
  };

  const { checkReady, modalOpen, result, closeModal } = useFeatureVersionReadinessCheck(() => {
    void loadFeatures();
  });

  const runTransition = async (feature: Feature, target: VersionStatus) => {
    await featureVersionsApi.transition({
      featureVersionId: feature.id,
      status: target,
    });
    showToast('Статус версии обновлён', ToastVariant.Success);
    await loadFeatures();
  };

  const openCriticalTransition = async (feature: Feature, target: VersionStatus) => {
    if (!featureElementId) return;
    setPendingTransition({ feature, target });
    setCriticalOpen(true);
    setCriticalLoading(true);
    setImpactData(null);
    try {
      const impact = await impactApi.byFeature(featureElementId, 'draft');
      setImpactData(impact);
    } catch (err) {
      showToast(getErrorMessage(err), ToastVariant.Error);
      setCriticalOpen(false);
      setPendingTransition(null);
    } finally {
      setCriticalLoading(false);
    }
  };

  const openCreateModal = () => {
    setCreateVersion(suggestedVersion);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!featureElementId) return;
    setCreateLoading(true);
    try {
      await featureVersionsApi.create({
        featureElementId,
        version: createVersion.trim(),
      });
      showToast('Версия создана', ToastVariant.Success);
      setCreateOpen(false);
      loadFeatures();
    } catch (err: unknown) {
      const text = getErrorMessage(err, 'Не удалось создать версию');
      showToast(text, ToastVariant.Error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleTransition = async (feature: Feature, target: VersionStatus) => {
    const st = parseVersionStatus(feature.status);
    if (!st) return;
    if (featureVersionNeedsCriticalConfirm(st, target)) {
      await openCriticalTransition(feature, target);
      return;
    }
    try {
      await runTransition(feature, target);
    } catch (err: unknown) {
      const text = getErrorMessage(err, 'Переход статуса не выполнен');
      showToast(text, ToastVariant.Error);
    }
  };

  const confirmCriticalTransition = async () => {
    if (!pendingTransition) return;
    const { feature, target } = pendingTransition;
    setCriticalOpen(false);
    setPendingTransition(null);
    setImpactData(null);
    try {
      await runTransition(feature, target);
    } catch (err: unknown) {
      const text = getErrorMessage(err, 'Переход статуса не выполнен');
      showToast(text, ToastVariant.Error);
    }
  };

  const handleView = (featureVersionRow?: Feature) => {
    if (!featureVersionRow?.id) return;
    navigate(featureVersionDiagramPath(featureVersionRow.id));
  };

  const openDeleteModal = (id: string) => {
    setDeleteTargetId(id);
    setDeleteBlocking(null);
    setDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteTargetId(null);
    setDeleteBlocking(null);
    setDeleteLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId || deleteBlocking !== null) return;
    setDeleteLoading(true);
    try {
      await featureVersionsApi.remove(deleteTargetId);
      showToast('Версия удалена', ToastVariant.Success);
      closeDeleteModal();
      loadFeatures();
    } catch (err: unknown) {
      const blocked = parseFeatureVersionDeletionBlocked(err);
      if (blocked) {
        setDeleteBlocking(blocked);
        return;
      }
      showToast(
        getErrorMessage(err, 'Не удалось удалить версию'),
        ToastVariant.Error,
      );
      closeDeleteModal();
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: ColumnsType<Feature> = [
    { key: 'name', title: 'Название', dataIndex: 'name' },
    {
      key: 'description',
      title: 'Описание',
      render: (_, feature) => feature.description || '-',
    },
    { key: 'version', title: 'Версия', dataIndex: 'version' },
    {
      key: 'status',
      title: 'Статус',
      render: (_, feature) => (
        <VersionLifecycleStatusTag status={parseVersionStatus(feature.status)} />
      ),
    },
    {
      key: 'ready',
      title: 'Готовность',
      render: (_, feature) =>
        feature.status === VersionStatusConst.Draft ? (
          <Tag color={feature.readyToProduction ? 'success' : 'default'}>
            {feature.readyToProduction ? 'Готов к публикации' : 'Не готов'}
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      key: 'services',
      title: 'Услуги',
      render: (_, feature) =>
        feature.services && feature.services.length > 0
          ? feature.services.map((s) => s.name).join(', ')
          : '-',
    },
    {
      key: 'componentCount',
      title: 'Количество компонентов',
      render: (_, feature) => formatRelationCount(feature.componentCount),
    },
    {
      key: 'teamCount',
      title: 'Количество команд',
      render: (_, feature) => formatRelationCount(feature.teamCount),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (_, feature) => {
        const st = parseVersionStatus(feature.status);
        const targets =
          st !== null
            ? filterFeatureVersionTransitionTargets(st, allowedTargetsFeatureVersion(st))
            : [];
        const canRemove =
          feature.status === VersionStatusConst.Draft &&
          Number(feature.versionNumber ?? 0) === maxDraftVersionNumber;
        const publishBlocked = isEmptyFeatureDraftPublishBlocked(
          feature.status,
          feature.componentVersions,
        );
        return (
          <div className="table-actions">
            {feature.status === VersionStatusConst.Draft ? (
              <Button htmlType="button" onClick={() => void checkReady(feature.id)}>
                Проверить готовность
              </Button>
            ) : null}
            {targets.map((t) => (
              <Button
                key={t}
                htmlType="button"
                type="primary"
                disabled={t === VersionStatusConst.Active && publishBlocked}
                onClick={() => void handleTransition(feature, t)}
              >
                {featureVersionTransitionLabel(t)}
              </Button>
            ))}
            <Button htmlType="button" onClick={() => handleView(feature)}>
              {feature.status === VersionStatusConst.Draft ? 'Изменить' : 'Открыть'}
            </Button>
            {canRemove ? (
              <Button htmlType="button" danger onClick={() => openDeleteModal(feature.id)}>
                Удалить
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>Версии фичи</h1>
        <div className="table-actions">
          <Button
            htmlType="button"
            type="primary"
            onClick={openCreateModal}
            disabled={features.some((f) => f.status === VersionStatusConst.Draft)}
          >
            Создать версию
          </Button>
        </div>
      </header>

      <Table<Feature>
        columns={columns}
        dataSource={features}
        rowKey={(feature) => feature.id}
        pagination={false}
      />

      <Modal
        title="Новая версия фичи"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={createLoading}
        okText="Создать"
        cancelText="Отмена"
      >
        <label className="entity-modal-form__field">
          <span>Версия</span>
          <Input
            value={createVersion}
            onChange={(event) => setCreateVersion(event.target.value)}
            placeholder={suggestedVersion}
          />
        </label>
      </Modal>

      <Modal
        title="Удалить версию фичи"
        open={deleteOpen}
        onCancel={closeDeleteModal}
        onOk={() => void confirmDelete()}
        confirmLoading={deleteLoading}
        okText="Удалить"
        okButtonProps={{ danger: true, disabled: deleteBlocking !== null }}
        cancelText="Отмена"
      >
        {deleteBlocking !== null ? (
          <>
            <p>Нельзя удалить версию: найдены блокирующие связи.</p>
            <ul>
              {deleteBlocking.map((row) => (
                <li key={`${row.relationType}-${row.direction}-${row.targetId}`}>
                  {formatBlockingRelationLine(row)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Удалить этот черновик версии фичи? Состав USES будет снят вместе с версией.</p>
        )}
      </Modal>

      <ImpactConfirmDialog
        isOpen={criticalOpen}
        title="Подтверждение изменения статуса"
        intro="Операция затрагивает связанные сущности и команды. Просмотрите область влияния и подтвердите продолжение."
        impact={impactData}
        loading={criticalLoading}
        onConfirm={confirmCriticalTransition}
        onCancel={() => {
          setCriticalOpen(false);
          setPendingTransition(null);
          setImpactData(null);
        }}
      />

      <FeatureReadinessModal isOpen={modalOpen} result={result} onClose={closeModal} />
    </section>
  );
}
