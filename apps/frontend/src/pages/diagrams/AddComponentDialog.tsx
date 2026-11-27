import { useState, useEffect, useMemo } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Space, Table } from 'antd';
import { applicationsApi } from '../../api/applications-api';
import { componentVersionsApi } from '../../api/component-versions-api';
import { teamsApi } from '../../api/teams-api';
import type { ColumnsType } from 'antd/es/table';
import type {
  ApplicationEntity,
  ComponentVersionApplicationUsage,
} from '@stellode/models';
import { getErrorMessage } from '../../utils/axios-error';
import { shouldDisableEmptyOptionsSelect } from '../../utils/should-disable-empty-options-select';
import { ApplicationCreateDialog } from '../applications/ApplicationCreateDialog';
import './Diagrams.css';

interface ComponentVersionItem {
  id: string;
  version: string;
  versionNumber?: number;
  status: string;
  name?: string;
  usage?: ComponentVersionApplicationUsage[];
}

interface ComponentWithVersions {
  component: { id: string; name: string; isDependency: boolean };
  versions: ComponentVersionItem[];
  team: { id: string; name: string } | null;
}

interface TeamItem {
  id: string;
  name: string;
}

export interface SelectedVersion {
  id: string;
  componentName: string;
  version: string;
  versionNumber?: number;
  status?: string;
  applicationId?: string;
}

export type AddComponentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  unitId: string | undefined;
  onSelect: (version: SelectedVersion) => void;
  requireApplicationBinding?: boolean;
};

type Screen =
  | { kind: 'list' }
  | { kind: 'versions'; componentId: string; componentName: string }
  | {
      kind: 'application';
      componentId: string;
      componentName: string;
      version: ComponentVersionItem;
    };

const matchesNameFilter = (name: string, filter: string) =>
  !filter || name.toLowerCase().includes(filter.toLowerCase());

const matchesTeamFilter = (team: { id: string } | null, teamId: string) =>
  !teamId || team?.id === teamId;

const resolveInitialApplicationId = (
  usage: readonly ComponentVersionApplicationUsage[],
  applications: readonly ApplicationEntity[],
): string => {
  const preferred = usage[0]?.applicationId;
  if (preferred && applications.some((application) => application.id === preferred)) {
    return preferred;
  }
  return applications[0]?.id ?? '';
};

export function AddComponentDialog({
  isOpen,
  onClose,
  unitId,
  onSelect,
  requireApplicationBinding = false,
}: AddComponentDialogProps) {
  const [data, setData] = useState<ComponentWithVersions[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [applications, setApplications] = useState<ApplicationEntity[]>([]);
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [nameFilter, setNameFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [createAppOpen, setCreateAppOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !unitId) return;
    setScreen({ kind: 'list' });
    setNameFilter('');
    setTeamFilter('');
    setError(null);
    setSelectedApplicationId('');
    setCreateAppOpen(false);

    Promise.all([
      componentVersionsApi.forUnit(unitId),
      teamsApi.list(unitId),
      applicationsApi.list(unitId),
    ])
      .then(([cvRows, teamRows, applicationRows]) => {
        setData(cvRows as ComponentWithVersions[]);
        setTeams(teamRows);
        setApplications(Array.isArray(applicationRows) ? (applicationRows as ApplicationEntity[]) : []);
      })
      .catch((err: unknown) => setError(getErrorMessage(err)));
  }, [isOpen, unitId]);

  const close = () => {
    setScreen({ kind: 'list' });
    setCreateAppOpen(false);
    onClose();
  };

  const completeSelection = (
    version: ComponentVersionItem,
    componentName: string,
    applicationId: string,
  ) => {
    onSelect({
      id: version.id,
      componentName,
      version: version.version,
      versionNumber: version.versionNumber,
      status: version.status,
      applicationId,
    });
    close();
  };

  const openApplicationScreen = (
    version: ComponentVersionItem,
    componentName: string,
    componentId: string,
  ) => {
    setSelectedApplicationId(
      resolveInitialApplicationId(version.usage ?? [], applications),
    );
    setScreen({
      kind: 'application',
      componentId,
      componentName,
      version,
    });
  };

  const handleSelectVersion = (
    version: ComponentVersionItem,
    componentName: string,
    componentId: string,
  ) => {
    if (!requireApplicationBinding) {
      onSelect({
        id: version.id,
        componentName,
        version: version.version,
        versionNumber: version.versionNumber,
        status: version.status,
      });
      close();
      return;
    }
    openApplicationScreen(version, componentName, componentId);
  };

  const filteredData = useMemo(
    () =>
      data.filter(
        (row) =>
          matchesNameFilter(row.component.name, nameFilter) &&
          matchesTeamFilter(row.team, teamFilter),
      ),
    [data, nameFilter, teamFilter],
  );

  const selectedVersions = useMemo(() => {
    if (screen.kind !== 'versions') return [];
    return data.find((row) => row.component.id === screen.componentId)?.versions ?? [];
  }, [data, screen]);

  const applicationSelectOptions = useMemo(
    () => applications.map((application) => ({ value: application.id, label: application.name })),
    [applications],
  );

  const componentColumns: ColumnsType<ComponentWithVersions> = [
    {
      key: 'component',
      title: 'Компонент',
      render: (_, row) => row.component.name,
    },
    {
      key: 'team',
      title: 'Команда',
      render: (_, row) => row.team?.name ?? '—',
    },
    {
      key: 'versions',
      title: 'Версии',
      render: (_, row) => (
        <Button
          htmlType="button"
          type="link"
          size="small"
          onClick={() =>
            setScreen({
              kind: 'versions',
              componentId: row.component.id,
              componentName: row.component.name,
            })
          }
        >
          {row.versions.length} version{row.versions.length !== 1 ? 's' : ''}
        </Button>
      ),
    },
  ];

  const versionColumns: ColumnsType<ComponentVersionItem> = [
    { key: 'version', title: 'Версия', dataIndex: 'version' },
    { key: 'status', title: 'Статус', dataIndex: 'status' },
    {
      key: 'usage',
      title: 'Apps (current)',
      render: (_, version) => String(version.usage?.length ?? 0),
    },
    {
      key: 'select',
      title: '',
      render: (_, version) => (
        <Button
          htmlType="button"
          type="primary"
          onClick={() =>
            handleSelectVersion(
              version,
              screen.kind === 'versions' ? screen.componentName : '',
              screen.kind === 'versions' ? screen.componentId : '',
            )
          }
        >
          Выбрать
        </Button>
      ),
    },
  ];

  const title =
    screen.kind === 'versions'
      ? `Versions: ${screen.componentName}`
      : screen.kind === 'application'
        ? `Приложение: ${screen.componentName} v${screen.version.version}`
        : 'Add component';

  const teamFilterOptions = teams.map((team) => ({ value: team.id, label: team.name }));

  return (
    <>
      <Modal open={isOpen} onCancel={close} title={title} footer={null} width={800}>
        {error ? (
          <Alert
            type="error"
            title={error}
            showIcon
            className="entity-modal-form__alert--compact"
            closable={{ onClose: () => setError(null) }}
          />
        ) : null}
        <div className="add-component-dialog-body">
          {screen.kind === 'application' ? (
            <>
              <div className="bind-application-pick">
                <Select
                  className="bind-application-pick__select"
                  placeholder="Выберите приложение"
                  value={selectedApplicationId || undefined}
                  options={applicationSelectOptions}
                  disabled={shouldDisableEmptyOptionsSelect(applicationSelectOptions.length)}
                  showSearch
                  optionFilterProp="label"
                  onChange={(value) => setSelectedApplicationId(value)}
                />
                <Button htmlType="button" onClick={() => setCreateAppOpen(true)}>
                  Создать приложение
                </Button>
              </div>
              <Space className="entity-modal-form__actions">
                <Button
                  htmlType="button"
                  onClick={() =>
                    setScreen({
                      kind: 'versions',
                      componentId: screen.componentId,
                      componentName: screen.componentName,
                    })
                  }
                >
                  Назад
                </Button>
                <Button
                  htmlType="button"
                  type="primary"
                  disabled={!selectedApplicationId}
                  onClick={() =>
                    completeSelection(screen.version, screen.componentName, selectedApplicationId)
                  }
                >
                  Привязать
                </Button>
              </Space>
            </>
          ) : screen.kind === 'versions' ? (
            <>
              <div className="add-component-dialog-back">
                <Button htmlType="button" onClick={() => setScreen({ kind: 'list' })}>
                  ← Назад
                </Button>
              </div>
              <Table<ComponentVersionItem>
                columns={versionColumns}
                dataSource={selectedVersions}
                rowKey={(version) => version.id}
                pagination={false}
              />
            </>
          ) : (
            <>
              <Form layout="inline" component="div" className="add-component-filters">
                <Form.Item label="Команда">
                  <Select
                    allowClear
                    placeholder="Все команды"
                    className="add-component-filters__select"
                    value={teamFilter || undefined}
                    onChange={(value) => setTeamFilter(value ?? '')}
                    options={teamFilterOptions}
                  />
                </Form.Item>
                <Form.Item label="Имя">
                  <Input
                    allowClear
                    placeholder="Фильтр по имени…"
                    value={nameFilter}
                    onChange={(event) => setNameFilter(event.target.value)}
                    className="add-component-filters__input"
                  />
                </Form.Item>
              </Form>
              <Table<ComponentWithVersions>
                columns={componentColumns}
                dataSource={filteredData}
                rowKey={(row) => row.component.id}
                pagination={false}
              />
            </>
          )}
        </div>
      </Modal>
      <ApplicationCreateDialog
        open={createAppOpen}
        unitId={unitId}
        onCancel={() => setCreateAppOpen(false)}
        onCreated={(application) => {
          setApplications((prev) => [...prev, application]);
          setSelectedApplicationId(application.id);
          setCreateAppOpen(false);
        }}
      />
    </>
  );
}
