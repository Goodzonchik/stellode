import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Modal, Select, Space, Typography } from 'antd';
import { edgeApi } from '../../api/edge-api';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { featuresApi } from '../../api/features-api';
import { servicesApi } from '../../api/services-api';
import { unitsApi } from '../../api/units-api';

import type { CreateDependsOnFromFeatureVersionsDto } from '@stellode/models';

import { getErrorMessage } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import {
  collectProviderApplicationsFromUses,
  collectPublicCvOptionsForApplication,
  resolveCascadeSelection,
  type CrossUnitComponentVersionLite,
} from './cross-unit-depends-on-cascade';
import './CrossUnitDependsOnDialog.css';

type UnitRow = { readonly id: string; readonly name: string };

type ServiceRow = { readonly id: string; readonly name: string };

type FeatureRow = {
  readonly id: string;
  readonly name: string;
  readonly services?: ReadonlyArray<{ readonly id: string }>;
};

type FeatureVersionLite = {
  readonly id: string;
  readonly version?: unknown;
  readonly status?: string;
  readonly componentVersions?: ReadonlyArray<CrossUnitComponentVersionLite>;
};

type CrossUnitDependsOnDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly excludeUnitIds: ReadonlyArray<string>;
  readonly sourceComponentVersionId: string | null;
  readonly consumerFeatureVersionId: string | null;
  readonly consumerApplicationId: string | null;
  readonly onCompleted: () => void | Promise<void>;
};

type SelectOption = { readonly label: string; readonly value: string };

export function CrossUnitDependsOnDialog(props: CrossUnitDependsOnDialogProps) {
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<ReadonlyArray<UnitRow>>([]);
  const [services, setServices] = useState<ReadonlyArray<ServiceRow>>([]);
  const [features, setFeatures] = useState<ReadonlyArray<FeatureRow>>([]);
  const [featureVersions, setFeatureVersions] = useState<ReadonlyArray<FeatureVersionLite>>([]);
  const [pickUnitId, setPickUnitId] = useState<string | null>(null);
  const [pickServiceId, setPickServiceId] = useState<string | null>(null);
  const [pickFeatureId, setPickFeatureId] = useState<string | null>(null);
  const [pickFeatureVersionId, setPickFeatureVersionId] = useState<string | null>(null);
  const [pickProviderApplicationId, setPickProviderApplicationId] = useState<string | null>(null);
  const [pickTargetCvId, setPickTargetCvId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const excluded = useMemo(() => new Set(props.excludeUnitIds), [props.excludeUnitIds]);

  const cascadeResetAfterUnit = useCallback(() => {
    setServices([]);
    setFeatures([]);
    setFeatureVersions([]);
    setPickServiceId(null);
    setPickFeatureId(null);
    setPickFeatureVersionId(null);
    setPickProviderApplicationId(null);
    setPickTargetCvId(null);
  }, []);

  const fullReset = useCallback(() => {
    setError(null);
    setUnits([]);
    setPickUnitId(null);
    cascadeResetAfterUnit();
    setSubmitting(false);
  }, [cascadeResetAfterUnit]);

  useEffect(() => {
    if (!props.isOpen) {
      fullReset();
      return undefined;
    }
    return undefined;
  }, [props.isOpen, fullReset]);

  useEffect(() => {
    if (!props.isOpen) return;
    setError(null);
    unitsApi
      .list()
      .then((data) =>
        setUnits((Array.isArray(data) ? data : []).filter((unit) => !excluded.has(unit.id))),
      )
      .catch((e: unknown) => setError(getErrorMessage(e)));
  }, [props.isOpen, excluded]);

  useEffect(() => {
    if (!props.isOpen || !pickUnitId) {
      cascadeResetAfterUnit();
      return;
    }
    servicesApi
      .list(pickUnitId)
      .then((data) => {
        setPickServiceId(null);
        setPickFeatureId(null);
        setPickFeatureVersionId(null);
        setPickProviderApplicationId(null);
        setPickTargetCvId(null);
        setFeatures([]);
        setFeatureVersions([]);
        setServices(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => setError(getErrorMessage(e)));
  }, [props.isOpen, pickUnitId, cascadeResetAfterUnit]);

  useEffect(() => {
    if (!props.isOpen || !pickUnitId) return;
    if (pickServiceId === null || pickServiceId === undefined || pickServiceId === '') {
      setFeatures([]);
      setFeatureVersions([]);
      setPickFeatureId(null);
      setPickFeatureVersionId(null);
      setPickProviderApplicationId(null);
      setPickTargetCvId(null);
      return;
    }
    setFeatures([]);
    setFeatureVersions([]);
    setPickFeatureId(null);
    setPickFeatureVersionId(null);
    setPickProviderApplicationId(null);
    setPickTargetCvId(null);
    featuresApi
      .list<FeatureRow>(pickUnitId)
      .then((data) =>
        setFeatures(
          Array.isArray(data)
            ? data.filter((feature) =>
                (feature.services ?? []).some(
                  (service) => typeof service?.id === 'string' && service.id === pickServiceId,
                ),
              )
            : [],
        ),
      )
      .catch((e: unknown) => setError(getErrorMessage(e)));
  }, [props.isOpen, pickUnitId, pickServiceId]);

  useEffect(() => {
    if (!props.isOpen || !pickFeatureId) {
      setFeatureVersions([]);
      setPickFeatureVersionId(null);
      setPickProviderApplicationId(null);
      setPickTargetCvId(null);
      return;
    }
    setFeatureVersions([]);
    setPickFeatureVersionId(null);
    setPickProviderApplicationId(null);
    setPickTargetCvId(null);
    featureVersionsApi
      .list<FeatureVersionLite>(pickFeatureId)
      .then((data) => setFeatureVersions(Array.isArray(data) ? data : []))
      .catch((e: unknown) => setError(getErrorMessage(e)));
  }, [props.isOpen, pickFeatureId]);

  const selectedFv = featureVersions.find((fv) => fv.id === pickFeatureVersionId);
  const composition = selectedFv?.componentVersions ?? [];

  const unitOptions = useMemo<SelectOption[]>(
    () => units.map((unit) => ({ value: unit.id, label: unit.name })),
    [units],
  );

  const serviceOptions = useMemo<SelectOption[]>(
    () => services.map((service) => ({ value: service.id, label: service.name })),
    [services],
  );

  const featureOptions = useMemo<SelectOption[]>(
    () => features.map((feature) => ({ value: feature.id, label: feature.name })),
    [features],
  );

  const fvOptions = useMemo<SelectOption[]>(
    () =>
      featureVersions.map((fv) => ({
        value: fv.id,
        label: `v${String(fv.version ?? '')} (${String(fv.status ?? '')})`,
      })),
    [featureVersions],
  );

  const providerApplicationOptions = useMemo(
    () => collectProviderApplicationsFromUses(composition),
    [composition],
  );

  const publicCvOptions = useMemo(
    () => collectPublicCvOptionsForApplication(composition, pickProviderApplicationId),
    [composition, pickProviderApplicationId],
  );

  useEffect(() => {
    setPickUnitId((current) => resolveCascadeSelection(unitOptions, current));
  }, [unitOptions]);

  useEffect(() => {
    if (!pickUnitId) return;
    setPickServiceId((current) => resolveCascadeSelection(serviceOptions, current));
  }, [pickUnitId, serviceOptions]);

  useEffect(() => {
    if (!pickServiceId) return;
    setPickFeatureId((current) => resolveCascadeSelection(featureOptions, current));
  }, [pickServiceId, featureOptions]);

  useEffect(() => {
    if (!pickFeatureId) return;
    setPickFeatureVersionId((current) => resolveCascadeSelection(fvOptions, current));
  }, [pickFeatureId, fvOptions]);

  useEffect(() => {
    if (!pickFeatureVersionId) {
      setPickProviderApplicationId(null);
      setPickTargetCvId(null);
      return;
    }
    setPickProviderApplicationId((current) =>
      resolveCascadeSelection(providerApplicationOptions, current),
    );
  }, [pickFeatureVersionId, providerApplicationOptions]);

  useEffect(() => {
    if (!pickProviderApplicationId) {
      setPickTargetCvId(null);
      return;
    }
    setPickTargetCvId((current) => resolveCascadeSelection(publicCvOptions, current));
  }, [pickProviderApplicationId, publicCvOptions]);

  const dismiss = (): void => {
    fullReset();
    props.onClose();
  };

  const submit = async (): Promise<void> => {
    const srcCv = props.sourceComponentVersionId;
    const cfv = props.consumerFeatureVersionId;
    const consumerApp = props.consumerApplicationId;
    const tgtCv = pickTargetCvId;
    const pfv = pickFeatureVersionId;
    const providerApp = pickProviderApplicationId;

    setError(null);
    if (!srcCv?.trim()) {
      setError('Не выбрана исходная версия компонента');
      return;
    }
    if (!cfv?.trim()) {
      setError('Не задан черновик FeatureVersion для контекста связи');
      return;
    }
    if (!consumerApp?.trim()) {
      setError('Нужна привязка к приложению потребителя');
      return;
    }
    if (!pfv?.trim()) {
      setError('Выберите версию фичи поставщика');
      return;
    }
    if (!providerApp?.trim()) {
      setError('Выберите Application поставщика');
      return;
    }
    if (!tgtCv?.trim()) {
      setError('Выберите публичную версию компонента-поставщика');
      return;
    }

    const dto: CreateDependsOnFromFeatureVersionsDto = {
      sourceComponentVersionId: srcCv,
      targetComponentVersionId: tgtCv,
      consumerFeatureVersionId: cfv,
      providerFeatureVersionId: pfv,
      consumerApplicationId: consumerApp,
      providerApplicationId: providerApp,
    };

    setSubmitting(true);
    try {
      await edgeApi.createDependsOnFromFeatureVersions(dto);
      showToast('DEPENDS_ON создана', ToastVariant.Success);
      await Promise.resolve(props.onCompleted());
      dismiss();
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setError(msg);
      showToast(msg, ToastVariant.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const readyForSubmit =
    pickUnitId &&
    pickServiceId &&
    pickFeatureId &&
    pickFeatureVersionId &&
    pickProviderApplicationId &&
    pickTargetCvId &&
    props.sourceComponentVersionId &&
    props.consumerFeatureVersionId &&
    props.consumerApplicationId;

  const emptyCvHint =
    pickProviderApplicationId && publicCvOptions.length === 0
      ? 'В выбранном приложении нет публичных ComponentVersion со статусом active | deprecated | draft.'
      : null;

  const emptyAppHint =
    pickFeatureVersionId && providerApplicationOptions.length === 0
      ? 'В выбранной версии фичи нет привязок USES с applicationId.'
      : null;

  return (
    <Modal
      destroyOnHidden
      open={props.isOpen}
      footer={null}
      onCancel={dismiss}
      title="Связь с другим юнитом (DEPENDS_ON)"
    >
      <Typography.Paragraph type="secondary">
        Выберите контракт-поставщик в другом юните. Источник — текущая нода версии компонента в
        черновике фичи.
      </Typography.Paragraph>

      {error ? (
        <Alert
          type="error"
          title={error}
          showIcon
          closable={{ onClose: () => setError(null) }}
          className="entity-modal-form__alert"
        />
      ) : null}

      <Space direction="vertical" className="cross-unit-depends-on__stack" size={12}>
        <div>
          <Typography.Text>Unit поставщика</Typography.Text>
          <Select
            allowClear={unitOptions.length !== 1}
            disabled={unitOptions.length === 1}
            className="cross-unit-depends-on__field-select"
            placeholder="Выберите юнит"
            optionFilterProp="label"
            showSearch
            options={unitOptions}
            value={pickUnitId}
            onChange={(value: string | null) => setPickUnitId(value)}
          />
        </div>

        <div>
          <Typography.Text>Service</Typography.Text>
          <Select
            allowClear={serviceOptions.length !== 1}
            disabled={pickUnitId === null || serviceOptions.length === 1}
            className="cross-unit-depends-on__field-select"
            placeholder="Выберите услугу"
            optionFilterProp="label"
            showSearch
            options={serviceOptions}
            value={pickServiceId}
            onChange={(value: string | null) => setPickServiceId(value)}
          />
        </div>

        <div>
          <Typography.Text>Feature</Typography.Text>
          <Select
            allowClear={featureOptions.length !== 1}
            disabled={pickServiceId === null || featureOptions.length === 1}
            className="cross-unit-depends-on__field-select"
            placeholder="Выберите фичу"
            optionFilterProp="label"
            showSearch
            options={featureOptions}
            value={pickFeatureId}
            onChange={(value: string | null) => setPickFeatureId(value)}
          />
        </div>

        <div>
          <Typography.Text>FeatureVersion</Typography.Text>
          <Select
            allowClear={fvOptions.length !== 1}
            disabled={pickFeatureId === null || fvOptions.length === 1}
            className="cross-unit-depends-on__field-select"
            placeholder="Выберите версию фичи"
            optionFilterProp="label"
            showSearch
            options={fvOptions}
            value={pickFeatureVersionId}
            onChange={(value: string | null) => setPickFeatureVersionId(value)}
          />
        </div>

        <div>
          <Typography.Text>Application поставщика</Typography.Text>
          <Select
            allowClear={providerApplicationOptions.length !== 1}
            disabled={pickFeatureVersionId === null || providerApplicationOptions.length === 1}
            className="cross-unit-depends-on__field-select"
            placeholder="Выберите приложение из состава фичи"
            optionFilterProp="label"
            showSearch
            options={[...providerApplicationOptions]}
            value={pickProviderApplicationId}
            onChange={(value: string | null) => setPickProviderApplicationId(value)}
          />
          {emptyAppHint ? (
            <Typography.Paragraph className="cross-unit-depends-on__error-text" type="danger">
              {emptyAppHint}
            </Typography.Paragraph>
          ) : null}
        </div>

        <div>
          <Typography.Text>Компонент (isPublic)</Typography.Text>
          <Select
            allowClear={publicCvOptions.length !== 1}
            disabled={pickProviderApplicationId === null || publicCvOptions.length === 1}
            className="cross-unit-depends-on__field-select"
            placeholder="Выберите ComponentVersion-поставщик"
            optionFilterProp="label"
            showSearch
            options={[...publicCvOptions]}
            value={pickTargetCvId}
            onChange={(value: string | null) => setPickTargetCvId(value)}
          />
          {emptyCvHint ? (
            <Typography.Paragraph className="cross-unit-depends-on__error-text" type="danger">
              {emptyCvHint}
            </Typography.Paragraph>
          ) : null}
        </div>

        <div className="cross-unit-depends-on__actions">
          <Space>
            <Button htmlType="button" onClick={dismiss}>
              Отмена
            </Button>
            <Button type="primary" disabled={!readyForSubmit || submitting} onClick={() => void submit()}>
              Создать связь
            </Button>
          </Space>
        </div>
      </Space>
    </Modal>
  );
}
