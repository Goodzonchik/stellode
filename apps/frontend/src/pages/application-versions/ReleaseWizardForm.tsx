import { useEffect, useMemo, useState } from 'react';
import { useUnit } from '../../context/UnitContext';
import { applicationVersionsApi } from '../../api/application-versions-api';
import { Button, Input, Select, Space, Steps, Alert } from 'antd';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { uniqueTeamFilterOptions } from './releaseCatalogEligibility';
import { useReleaseComposition } from './useReleaseComposition';
import { ReleaseAddComponentsModal } from './ReleaseAddComponentsModal';
import { ReleaseCompositionTable } from './ReleaseCompositionTable';
import { ReleaseConsequencesStep } from './ReleaseConsequencesStep';
import { ReleaseConfirmationStep } from './ReleaseConfirmationStep';
import styles from './ReleaseWizardForm.module.css';

const readMessage = (errorValue: unknown): string | undefined =>
  errorValue && typeof errorValue === 'object' && 'response' in errorValue
    ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
    : undefined;

export type ReleaseWizardFormProps = {
  enabled: boolean;
  applicationId: string;
  sourceApplicationVersionId: string | null;
  suggestedApplicationVersion: string;
  onReleased: () => void;
  onCancel: () => void;
};

export function ReleaseWizardForm(props: ReleaseWizardFormProps) {
  const { unit } = useUnit();
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nameFilter, setNameFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [applicationVersion, setApplicationVersion] = useState(props.suggestedApplicationVersion);

  const composition = useReleaseComposition({
    enabled: props.enabled,
    sourceApplicationVersionId: props.sourceApplicationVersionId,
    unitId: unit?.id,
  });

  useEffect(() => {
    setApplicationVersion(props.suggestedApplicationVersion);
  }, [props.suggestedApplicationVersion]);

  useEffect(() => {
    if (!props.enabled) return;
    setStep(1);
    setNameFilter('');
    setTeamFilter('');
    setAddModalOpen(false);
  }, [props.enabled, props.sourceApplicationVersionId]);

  const teamFilterOptions = useMemo(
    () =>
      uniqueTeamFilterOptions(composition.rowsOrderedForDisplay.map((row) => row.team)),
    [composition.rowsOrderedForDisplay],
  );

  const filteredRows = useMemo(() => {
    const nameQuery = nameFilter.trim().toLowerCase();
    return composition.rowsOrderedForDisplay.filter((row) => {
      if (nameQuery && !row.component.name.toLowerCase().includes(nameQuery)) return false;
      if (teamFilter && row.team?.id !== teamFilter) return false;
      return true;
    });
  }, [composition.rowsOrderedForDisplay, nameFilter, teamFilter]);

  const release = async () => {
    try {
      const payload: {
        applicationId: string;
        components: typeof composition.componentsPayload;
        sourceApplicationVersionId?: string;
        version?: string;
      } = {
        applicationId: props.applicationId,
        components: composition.componentsPayload,
        version: applicationVersion.trim(),
      };
      if (props.sourceApplicationVersionId) {
        payload.sourceApplicationVersionId = props.sourceApplicationVersionId;
      }
      await applicationVersionsApi.release(payload);
      showToast('Релиз выполнен', ToastVariant.Success);
      props.onReleased();
    } catch (errorValue: unknown) {
      const message = readMessage(errorValue) || 'Релиз не выполнен';
      showToast(message, ToastVariant.Error);
    }
  };

  if (!props.enabled) return null;

  return (
    <div className={styles.root}>
      <div className={styles.steps}>
        <Steps
          current={step - 1}
          items={[
            { title: 'Состав релиза' },
            { title: 'Последствия' },
            { title: 'Подтверждение' },
          ]}
        />
      </div>

      {step === 1 ? (
        <>
          <div className="app-filters">
            <Input
              allowClear
              className="app-filter-input"
              placeholder="Фильтр по имени"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              className="app-filter-input"
              placeholder="Все команды"
              value={teamFilter || undefined}
              options={teamFilterOptions}
              onChange={(value) => setTeamFilter(value ?? '')}
            />
            <Button
              htmlType="button"
              type="primary"
              disabled={!unit?.id}
              onClick={() => setAddModalOpen(true)}
            >
              Добавить компоненты
            </Button>
          </div>

          {composition.componentsMissingActiveWarning.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              className={styles.confirmSection}
              title={`Нет active-строки у компонентов: ${composition.componentsMissingActiveWarning.join(', ')}`}
            />
          ) : null}

          <div className="app-table-wrap">
            <ReleaseCompositionTable
              rows={filteredRows}
              compositionRows={composition.rows}
              onRemove={composition.removeCv}
              onApplicationStatusChange={composition.setApplicationStatus}
              onBumpVersion={composition.bumpVersion}
            />
          </div>

          <Space className="entity-modal-form__actions">
            <Button htmlType="button" onClick={props.onCancel}>
              Отмена
            </Button>
            <Button
              htmlType="button"
              type="primary"
              onClick={() => setStep(2)}
              disabled={composition.rows.length === 0}
            >
              Далее
            </Button>
          </Space>

          <ReleaseAddComponentsModal
            open={addModalOpen}
            unitId={unit?.id}
            unitComponents={composition.unitComponents}
            compositionRows={composition.rows}
            onLoadCatalog={composition.loadAvailable}
            onAdd={composition.addComponentVersions}
            onClose={() => setAddModalOpen(false)}
          />
        </>
      ) : null}

      {step === 2 ? (
        <ReleaseConsequencesStep
          applicationId={props.applicationId}
          sourceApplicationVersionId={props.sourceApplicationVersionId}
          components={composition.componentsPayload}
          onBack={() => setStep(1)}
          onCancel={props.onCancel}
          onNext={() => setStep(3)}
        />
      ) : null}

      {step === 3 ? (
        <ReleaseConfirmationStep
          applicationVersion={applicationVersion}
          onApplicationVersionChange={setApplicationVersion}
          initialReleaseRows={composition.initialReleaseRows}
          rowsOrderedForDisplay={composition.rowsOrderedForDisplay}
          onBack={() => setStep(2)}
          onCancel={props.onCancel}
          onRelease={() => void release()}
        />
      ) : null}
    </div>
  );
}
