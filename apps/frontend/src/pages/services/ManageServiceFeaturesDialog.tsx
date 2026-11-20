import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Select, Space } from 'antd';
import { featuresApi } from '../../api/features-api';
import { servicesApi } from '../../api/services-api';
import { getErrorMessage } from '../../utils/axios-error';
import { RemoveFeatureFromServiceDialog } from '../diagrams/RemoveFeatureFromServiceDialog';
import {
  featuresInService,
  featuresOutsideService,
  type FeatureWithServiceRefs,
} from './service-feature-membership';
import './ManageServiceFeaturesDialog.css';

type ManageServiceFeaturesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  unitId: string | undefined;
  serviceId: string | undefined;
  serviceName: string;
  onSuccess: (kind: 'add' | 'remove') => void;
};

type ExcludeTarget = {
  featureId: string;
  featureName: string;
};

export const ManageServiceFeaturesDialog = ({
  isOpen,
  onClose,
  unitId,
  serviceId,
  serviceName,
  onSuccess,
}: ManageServiceFeaturesDialogProps) => {
  const [features, setFeatures] = useState<FeatureWithServiceRefs[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedAddId, setSelectedAddId] = useState('');
  const [excludeTarget, setExcludeTarget] = useState<ExcludeTarget | null>(null);

  const reloadFeatures = useCallback(async (): Promise<void> => {
    if (!unitId) return;
    setLoadError(null);
    try {
      setFeatures(await featuresApi.list<FeatureWithServiceRefs>(unitId));
    } catch (err: unknown) {
      setLoadError(getErrorMessage(err));
    }
  }, [unitId]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedAddId('');
    setAddError(null);
    setExcludeTarget(null);
    setListLoading(true);
    void reloadFeatures().finally(() => setListLoading(false));
  }, [isOpen, reloadFeatures]);

  const linked = useMemo(
    () => (serviceId ? featuresInService(features, serviceId) : []),
    [features, serviceId],
  );

  const available = useMemo(
    () => (serviceId ? featuresOutsideService(features, serviceId) : []),
    [features, serviceId],
  );

  const addSelectOptions = useMemo(
    () => available.map((f) => ({ value: f.id, label: f.name })),
    [available],
  );

  const handleSelectAdd = async (featureId: string): Promise<void> => {
    if (!serviceId || !featureId) return;
    setAddBusy(true);
    setAddError(null);
    try {
      await servicesApi.addAggregate(serviceId, { featureId });
      setSelectedAddId('');
      await reloadFeatures();
      onSuccess('add');
    } catch (err: unknown) {
      setAddError(getErrorMessage(err));
      setSelectedAddId('');
    } finally {
      setAddBusy(false);
    }
  };

  const dialogError = loadError ?? addError;

  return (
    <>
      <Modal
        open={isOpen}
        onCancel={onClose}
        title={`Управление фичами: ${serviceName}`}
        footer={null}
      >
        {dialogError && (
          <Alert
            type="error"
            title={dialogError}
            showIcon
            className="entity-modal-form__alert"
            closable={{
              onClose: () => {
                setLoadError(null);
                setAddError(null);
              },
            }}
          />
        )}
        {listLoading ? (
          <p>Загрузка…</p>
        ) : (
          <Form layout="vertical" component="div">
            <Form.Item label="Добавить фичу в услугу">
              <Select
                placeholder="— выберите фичу —"
                options={addSelectOptions}
                value={selectedAddId || undefined}
                disabled={addBusy || !available.length}
                onChange={(next) => {
                  const id = next ?? '';
                  setSelectedAddId(id);
                  if (id) void handleSelectAdd(id);
                }}
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <h3 className="manage-service-features-heading">Фичи в составе</h3>
            {linked.length === 0 ? (
              <p className="manage-service-features-empty">В услуге пока нет фич.</p>
            ) : (
              <table className="app-table manage-service-features-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {linked.map((f) => (
                    <tr key={f.id}>
                      <td>{f.name}</td>
                      <td>
                        <Button
                          htmlType="button"
                          disabled={addBusy}
                          onClick={() => setExcludeTarget({ featureId: f.id, featureName: f.name })}
                        >
                          Исключить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Form>
        )}

        <Space className="entity-modal-form__actions">
          <Button htmlType="button" onClick={onClose}>
            Закрыть
          </Button>
        </Space>
      </Modal>

      <RemoveFeatureFromServiceDialog
        isOpen={excludeTarget !== null}
        onClose={() => setExcludeTarget(null)}
        serviceId={serviceId}
        featureId={excludeTarget?.featureId}
        featureName={excludeTarget?.featureName ?? ''}
        onSuccess={() => {
          void reloadFeatures();
          onSuccess('remove');
          setExcludeTarget(null);
        }}
      />
    </>
  );
};
