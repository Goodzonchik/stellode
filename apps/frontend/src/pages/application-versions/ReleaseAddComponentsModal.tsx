import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { buildReleaseCatalogRows, type ReleaseCatalogRow } from './buildReleaseCatalogRows';
import { uniqueTeamFilterOptions } from './releaseCatalogEligibility';
import type { UnitComponentCatalog } from './releaseWizardCatalog';
import type { ReleaseComponentRow } from './releaseWizardTypes';
import type { CatalogPickItem } from './useReleaseComposition';
import styles from './ReleaseAddComponentsModal.module.css';

export type ReleaseAddComponentsModalProps = {
  open: boolean;
  unitId: string | undefined;
  unitComponents: UnitComponentCatalog[];
  compositionRows: ReleaseComponentRow[];
  onLoadCatalog: () => Promise<void>;
  onAdd: (picks: CatalogPickItem[]) => void;
  onClose: () => void;
};

type SelectionState = Record<string, string>;

const matchesName = (name: string, filter: string): boolean =>
  !filter || name.toLowerCase().includes(filter.toLowerCase());

const matchesTeam = (team: ReleaseComponentRow['team'], teamId: string): boolean =>
  !teamId || team?.id === teamId;

const toPick = (row: ReleaseCatalogRow, versionId: string): CatalogPickItem | null => {
  const version = row.eligible.find((item) => item.id === versionId);
  if (!version) return null;
  return {
    component: row.component,
    team: row.team,
    componentVersion: {
      id: version.id,
      componentId: row.component.id,
      version: version.version,
      versionNumber: version.versionNumber,
      status: version.status,
    },
    usageCount: version.usageCount,
  };
};

export function ReleaseAddComponentsModal(props: ReleaseAddComponentsModalProps) {
  const [nameFilter, setNameFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [versionByComponent, setVersionByComponent] = useState<SelectionState>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    setNameFilter('');
    setTeamFilter('');
    setSelectedIds([]);
    setVersionByComponent({});
    setLoading(true);
    void props.onLoadCatalog().finally(() => setLoading(false));
  }, [props.open, props.onLoadCatalog]);

  const catalogRows = useMemo(
    () => buildReleaseCatalogRows(props.unitComponents, props.compositionRows),
    [props.unitComponents, props.compositionRows],
  );

  useEffect(() => {
    setVersionByComponent((previous) => {
      const next: SelectionState = {};
      for (const row of catalogRows) {
        const current = previous[row.component.id];
        next[row.component.id] = row.eligible.some((item) => item.id === current)
          ? current
          : row.defaultComponentVersionId;
      }
      return next;
    });
    setSelectedIds((previous) =>
      previous.filter((componentId) =>
        catalogRows.some((row) => row.component.id === componentId),
      ),
    );
  }, [catalogRows]);

  const teamOptions = useMemo(
    () => uniqueTeamFilterOptions(catalogRows.map((row) => row.team)),
    [catalogRows],
  );

  const filteredRows = useMemo(
    () =>
      catalogRows.filter(
        (row) =>
          matchesName(row.component.name, nameFilter.trim()) &&
          matchesTeam(row.team, teamFilter),
      ),
    [catalogRows, nameFilter, teamFilter],
  );

  const columns: ColumnsType<ReleaseCatalogRow> = [
    {
      title: 'Компонент',
      key: 'component',
      render: (_, row) => row.component.name,
    },
    {
      title: 'Команда',
      key: 'team',
      render: (_, row) => row.team?.name ?? '—',
    },
    {
      title: 'Версия',
      key: 'version',
      render: (_, row) => (
        <Select
          className={styles.versionSelect}
          value={versionByComponent[row.component.id] || undefined}
          options={row.eligible.map((item) => ({
            value: item.id,
            label: `v${item.version} (${item.status}, apps: ${item.usageCount})`,
          }))}
          onChange={(value) =>
            setVersionByComponent((previous) => ({
              ...previous,
              [row.component.id]: value,
            }))
          }
        />
      ),
    },
  ];

  const submit = () => {
    const picks = selectedIds
      .map((componentId) => {
        const row = catalogRows.find((item) => item.component.id === componentId);
        if (!row) return null;
        return toPick(row, versionByComponent[componentId] ?? row.defaultComponentVersionId);
      })
      .filter((pick): pick is CatalogPickItem => pick !== null);
    props.onAdd(picks);
    props.onClose();
  };

  return (
    <Modal
      open={props.open}
      title="Добавить компоненты"
      onCancel={props.onClose}
      width={820}
      footer={
        <Space>
          <Button htmlType="button" onClick={props.onClose}>
            Закрыть
          </Button>
          <Button
            htmlType="button"
            type="primary"
            disabled={selectedIds.length === 0 || !props.unitId}
            onClick={submit}
          >
            Добавить выбранные
          </Button>
        </Space>
      }
    >
      <div className="app-filters">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Все команды"
          className="app-filter-input"
          value={teamFilter || undefined}
          options={teamOptions}
          onChange={(value) => setTeamFilter(value ?? '')}
        />
        <Input
          allowClear
          className="app-filter-input"
          placeholder="Фильтр по имени"
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
        />
      </div>
      <div className="app-table-wrap">
        <Table
          size="small"
          loading={loading}
          rowKey={(row) => row.component.id}
          dataSource={filteredRows}
          columns={columns}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys.map(String)),
          }}
          locale={{ emptyText: loading ? 'Загрузка…' : 'Нет доступных компонентов' }}
        />
      </div>
    </Modal>
  );
}
