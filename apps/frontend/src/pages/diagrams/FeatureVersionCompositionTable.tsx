import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { DiagramMenuItem } from './diagram-context-menu.config';
import type {
  FeatureVersionCompositionTable as FeatureVersionTableModel,
  FeatureVersionTableGroup,
  FeatureVersionTableRow,
} from './build-feature-version-composition-table';
import styles from './FeatureVersionCompositionTable.module.css';

type Props = {
  readonly model: FeatureVersionTableModel;
  readonly paneActions: readonly DiagramMenuItem[];
  readonly onPaneAction: (action: DiagramMenuItem['action']) => void;
  readonly showCheckReady?: boolean;
  readonly onCheckReady?: () => void;
  readonly actionsForRow: (
    row: FeatureVersionTableRow,
    composition: boolean,
  ) => readonly DiagramMenuItem[];
  readonly onRowAction: (
    action: DiagramMenuItem['action'],
    row: FeatureVersionTableRow,
  ) => void;
};

const rowClassName = (row: FeatureVersionTableRow): string => {
  if (row.diffStatus === 'added') return styles.rowAdded ?? '';
  if (row.diffStatus === 'removed') return styles.rowRemoved ?? '';
  return '';
};

const columnsFor = (
  rows: readonly FeatureVersionTableRow[],
  composition: boolean,
  actionsForRow: Props['actionsForRow'],
  onRowAction: Props['onRowAction'],
): ColumnsType<FeatureVersionTableRow> => {
  const columns: ColumnsType<FeatureVersionTableRow> = [
    { title: 'Компонент', dataIndex: 'componentName', key: 'componentName' },
    { title: 'Версия', dataIndex: 'version', key: 'version' },
    { title: 'Команда', dataIndex: 'teamLabel', key: 'teamLabel' },
  ];
  const hasActions = rows.some((row) => actionsForRow(row, composition).length > 0);
  if (!hasActions) return columns;
  return [
    ...columns,
    {
      title: 'Действия',
      key: 'actions',
      width: 280,
      render: (_value, row) => (
        <div className={styles.actions}>
          {actionsForRow(row, composition).map((item) => (
            <Button
              key={item.id}
              htmlType="button"
              size="small"
              onClick={() => onRowAction(item.action, row)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ),
    },
  ];
};

const GroupTable = ({
  group,
  composition,
  actionsForRow,
  onRowAction,
}: {
  readonly group: FeatureVersionTableGroup;
  readonly composition: boolean;
  readonly actionsForRow: Props['actionsForRow'];
  readonly onRowAction: Props['onRowAction'];
}) => (
  <section className={styles.group}>
    <h3 className={styles.groupTitle}>{group.title}</h3>
    <div className={styles.tableWrap}>
      <Table<FeatureVersionTableRow>
        size="small"
        pagination={false}
        rowKey="key"
        dataSource={[...group.rows]}
        columns={columnsFor(group.rows, composition, actionsForRow, onRowAction)}
        rowClassName={rowClassName}
        scroll={{ x: true }}
      />
    </div>
  </section>
);

export const FeatureVersionCompositionTable = ({
  model,
  paneActions,
  onPaneAction,
  showCheckReady = false,
  onCheckReady,
  actionsForRow,
  onRowAction,
}: Props) => (
  <div className={styles.root}>
    {paneActions.length > 0 || showCheckReady ? (
      <div className={styles.paneActions}>
        {showCheckReady && onCheckReady !== undefined ? (
          <Button htmlType="button" onClick={onCheckReady}>
            Проверить готовность
          </Button>
        ) : null}
        {paneActions.map((item) => (
          <Button key={item.id} htmlType="button" onClick={() => onPaneAction(item.action)}>
            {item.label}
          </Button>
        ))}
      </div>
    ) : null}
    {model.ownGroups.map((group) => (
      <GroupTable
        key={group.applicationId}
        group={group}
        composition
        actionsForRow={actionsForRow}
        onRowAction={onRowAction}
      />
    ))}
    {model.foreignBlocks.map((block) => (
      <section key={block.key} className={styles.foreign}>
        <h2 className={styles.unitTitle}>{block.unitName}</h2>
        <dl className={styles.pair}>
          <div>
            <dt>Услуга</dt>
            <dd>{block.serviceName}</dd>
          </div>
          <div>
            <dt>Фича</dt>
            <dd>{block.featureName}</dd>
          </div>
        </dl>
        {block.groups.map((group) => (
          <GroupTable
            key={`${block.key}::${group.applicationId}`}
            group={group}
            composition={false}
            actionsForRow={actionsForRow}
            onRowAction={onRowAction}
          />
        ))}
      </section>
    ))}
  </div>
);
