import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { applicationsApi } from '../../api/applications-api';
import { componentsApi } from '../../api/components-api';
import { teamsApi } from '../../api/teams-api';
import { Alert, Button, Checkbox, Form, Input, Modal, Select, Space, Switch, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { ApplicationEntity, TeamEntity } from '@stellode/models';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/axios-error';
import { shouldDisableEmptyOptionsSelect } from '../../utils/should-disable-empty-options-select';
import { ApplicationCreateDialog } from '../applications/ApplicationCreateDialog';

export type ComponentCreateFormState = {
  name: string;
  description: string;
  teamId: string;
  applicationId: string;
  isDependency: boolean;
  isPublic: boolean;
};

const initialValues = (teamId: string): ComponentCreateFormState => ({
  name: '',
  description: '',
  teamId,
  applicationId: '',
  isDependency: false,
  isPublic: false,
});

export type ComponentCreateSuccess = {
  id?: string;
  draftComponentVersionId?: string;
  applicationId?: string;
};

export type ComponentCreateDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  unitId: string | undefined;
  requireApplicationBinding?: boolean;
  onSuccess: (created?: ComponentCreateSuccess | null) => void | Promise<void>;
};

export function ComponentCreateDialog({
  isOpen,
  onClose,
  unitId,
  requireApplicationBinding = false,
  onSuccess,
}: ComponentCreateDialogProps) {
  const { showToast } = useToast();
  const [form] = Form.useForm<ComponentCreateFormState>();
  const { entity, id } = useParams<{ entity?: string; id?: string }>();
  const lockedTeamId = entity === 'team' ? id : undefined;
  const [teams, setTeams] = useState<Pick<TeamEntity, 'id' | 'name'>[]>([]);
  const [applications, setApplications] = useState<ApplicationEntity[]>([]);
  const [createAppOpen, setCreateAppOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !unitId) return;
    setError(null);
    setCreateAppOpen(false);
    form.setFieldsValue(initialValues(lockedTeamId || ''));
    if (lockedTeamId) {
      setTeams([]);
    } else {
      teamsApi
        .list(unitId)
        .then(setTeams)
        .catch(() => setTeams([]));
    }
    if (requireApplicationBinding) {
      applicationsApi
        .list(unitId)
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          setApplications(list);
          if (list[0]?.id) form.setFieldValue('applicationId', list[0].id);
        })
        .catch(() => setApplications([]));
    } else {
      setApplications([]);
    }
  }, [isOpen, unitId, lockedTeamId, form, requireApplicationBinding]);

  const teamSelectOptions = teams.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  const applicationSelectOptions = applications.map((app) => ({
    value: app.id,
    label: app.name,
  }));

  const close = () => {
    form.resetFields();
    setError(null);
    setCreateAppOpen(false);
    onClose();
  };

  const submit = async (values: ComponentCreateFormState) => {
    setError(null);
    if (!unitId) {
      setError('Нужен юнит');
      return;
    }
    if (requireApplicationBinding && !values.applicationId) {
      setError('Выберите или создайте приложение');
      return;
    }
    try {
      const created = await componentsApi.create({
        unitId,
        name: values.name,
        description: values.description || undefined,
        teamId: values.teamId,
        isDependency: values.isDependency,
        isPublic: values.isPublic,
      });
      await Promise.resolve(
        onSuccess({
          ...(created ?? {}),
          ...(requireApplicationBinding ? { applicationId: values.applicationId } : {}),
        }),
      );
      showToast('Компонент создан', ToastVariant.Success);
      close();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Не удалось создать компонент');
      setError(msg);
      showToast(msg, ToastVariant.Error);
    }
  };

  return (
    <>
      <Modal
        open={isOpen && !createAppOpen}
        onCancel={close}
        title="Создание компонента"
        footer={null}
        destroyOnHidden
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
        <Form<ComponentCreateFormState>
          form={form}
          layout="vertical"
          initialValues={initialValues('')}
          onFinish={(values) => void submit(values)}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input placeholder="Название компонента" allowClear autoComplete="off" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea placeholder="Описание (необязательно)" rows={3} allowClear />
          </Form.Item>
          <Form.Item name="isDependency" valuePropName="checked">
            <Checkbox>Зависимость (dependency)</Checkbox>
          </Form.Item>
          <Form.Item
            label={
              <Space size="small">
                <span id="component-create-public-label">Публичный контракт</span>
                <Tooltip title="Разрешает cross-unit связи DEPENDS_ON и внешнюю экспозицию контракта; задаётся один раз при создании.">
                  <QuestionCircleOutlined aria-hidden />
                </Tooltip>
              </Space>
            }
            name="isPublic"
            valuePropName="checked"
          >
            <Switch aria-labelledby="component-create-public-label" />
          </Form.Item>
          {lockedTeamId ? (
            <Form.Item name="teamId" rules={[{ required: true, message: 'Нужна команда' }]} hidden>
              <Input type="hidden" />
            </Form.Item>
          ) : (
            <Form.Item
              name="teamId"
              label="Команда"
              rules={[{ required: true, message: 'Выберите команду' }]}
            >
              <Select
                placeholder="Выберите команду"
                options={teamSelectOptions}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          )}
          {requireApplicationBinding ? (
            <div className="bind-application-pick">
              <Form.Item
                name="applicationId"
                label="Приложение"
                rules={[{ required: true, message: 'Выберите или создайте приложение' }]}
              >
                <Select
                  className="bind-application-pick__select"
                  placeholder="Выберите приложение"
                  options={applicationSelectOptions}
                  disabled={shouldDisableEmptyOptionsSelect(applicationSelectOptions.length)}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                />
              </Form.Item>
              <Button htmlType="button" onClick={() => setCreateAppOpen(true)}>
                Создать приложение
              </Button>
            </div>
          ) : null}
          <Form.Item className="entity-modal-form__footer">
            <Space className="entity-modal-form__actions">
              <Button onClick={close}>Отмена</Button>
              <Button type="primary" htmlType="submit">
                Создать
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      <ApplicationCreateDialog
        open={createAppOpen}
        unitId={unitId}
        onCancel={() => setCreateAppOpen(false)}
        onCreated={(application) => {
          setApplications((prev) => [...prev, application]);
          form.setFieldValue('applicationId', application.id);
          setCreateAppOpen(false);
        }}
      />
    </>
  );
}
