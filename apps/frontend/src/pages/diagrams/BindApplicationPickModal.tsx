import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Select } from 'antd';
import { applicationsApi } from '../../api/applications-api';
import type { ApplicationEntity } from '@stellode/models';
import { getErrorMessage } from '../../utils/axios-error';
import { shouldDisableEmptyOptionsSelect } from '../../utils/should-disable-empty-options-select';
import { ApplicationCreateDialog } from '../applications/ApplicationCreateDialog';

export type BindApplicationPickModalProps = {
  open: boolean;
  unitId: string | undefined;
  title?: string;
  onCancel: () => void;
  onPicked: (applicationId: string) => void;
};

export function BindApplicationPickModal(props: BindApplicationPickModalProps) {
  const [applications, setApplications] = useState<ApplicationEntity[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!props.open || !props.unitId) return;
    setError(null);
    setSelectedId('');
    setCreateOpen(false);
    applicationsApi
      .list(props.unitId)
      .then((rows) => {
        const normalized = Array.isArray(rows) ? rows : [];
        setApplications(normalized as ApplicationEntity[]);
        setSelectedId(normalized[0]?.id ?? '');
      })
      .catch((errorValue: unknown) => setError(getErrorMessage(errorValue)));
  }, [props.open, props.unitId]);

  return (
    <>
      <Modal
        open={props.open && !createOpen}
        title={props.title ?? 'Выберите приложение для привязки'}
        onCancel={props.onCancel}
        onOk={() => {
          if (selectedId) props.onPicked(selectedId);
        }}
        okButtonProps={{ disabled: !selectedId }}
        okText="Привязать"
        cancelText="Отмена"
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
        <div className="bind-application-pick">
          <Select
            className="bind-application-pick__select"
            placeholder="Приложение"
            value={selectedId || undefined}
            options={applications.map((app) => ({ value: app.id, label: app.name }))}
            disabled={shouldDisableEmptyOptionsSelect(applications.length)}
            onChange={(value) => setSelectedId(value)}
          />
          <Button htmlType="button" onClick={() => setCreateOpen(true)}>
            Создать приложение
          </Button>
        </div>
      </Modal>
      <ApplicationCreateDialog
        open={createOpen}
        unitId={props.unitId}
        onCancel={() => setCreateOpen(false)}
        onCreated={(application) => {
          setCreateOpen(false);
          props.onPicked(application.id);
        }}
      />
    </>
  );
}
