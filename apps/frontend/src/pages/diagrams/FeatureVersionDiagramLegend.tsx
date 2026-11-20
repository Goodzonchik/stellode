import { Button, Card, Checkbox, Flex, Segmented, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import type { FeatureVersionLegendRow } from './feature-version-legend-row';
import { featureVersionDiagramPath } from './spa-diagram-paths';

const FEATURE_VERSION_LEGEND_LIMIT = 10;

type Props = {
  readonly rows: readonly FeatureVersionLegendRow[];
  readonly anchorFeatureVersionId: string | null;
  readonly tableView: boolean;
  readonly onTableViewChange: (tableView: boolean) => void;
  readonly teamsVisible: boolean;
  readonly onTeamsVisibleChange: (visible: boolean) => void;
  readonly crossUnitLinksVisible: boolean;
  readonly onCrossUnitLinksVisibleChange: (visible: boolean) => void;
  readonly compareEnabled: boolean;
  readonly compareAvailable: boolean;
  readonly onCompareEnabledChange: (enabled: boolean) => void;
  readonly teamsLocked?: boolean;
};

export const FeatureVersionDiagramLegend = ({
  rows,
  anchorFeatureVersionId,
  tableView,
  onTableViewChange,
  teamsVisible,
  onTeamsVisibleChange,
  crossUnitLinksVisible,
  onCrossUnitLinksVisibleChange,
  compareEnabled,
  compareAvailable,
  onCompareEnabledChange,
  teamsLocked = false,
}: Props) => {
  const navigate = useNavigate();
  const capped = rows.slice(0, FEATURE_VERSION_LEGEND_LIMIT);

  return (
    <Flex vertical gap={12} style={{ width: '100%' }}>
      <Card type="inner" size="small" title="Версии фичи">
        <Flex vertical gap={8} style={{ width: '100%' }}>
          {capped.map((item) => (
            <Button
              key={item.id}
              htmlType="button"
              block
              type={anchorFeatureVersionId === item.id ? 'primary' : 'default'}
              onClick={() => navigate(featureVersionDiagramPath(item.id))}
            >
              {`v${item.version} (${item.status})`}
            </Button>
          ))}
          {rows.length === 0 ? (
            <Typography.Text type="secondary">Нет версий</Typography.Text>
          ) : null}
        </Flex>
      </Card>
      <Card type="inner" size="small">
        <Flex vertical gap={8} style={{ width: '100%' }}>
          <Segmented
            block
            size="small"
            value={tableView ? 'table' : 'graph'}
            options={[
              { label: 'Граф', value: 'graph' },
              { label: 'Таблица', value: 'table' },
            ]}
            onChange={(value) => onTableViewChange(value === 'table')}
            aria-label="Вид диаграммы фичи: граф или таблица"
          />
          <Checkbox
            checked={teamsLocked || teamsVisible}
            disabled={teamsLocked}
            onChange={(event) => onTeamsVisibleChange(event.target.checked)}
          >
            Команды
          </Checkbox>
          <Checkbox
            checked={crossUnitLinksVisible}
            onChange={(event) => onCrossUnitLinksVisibleChange(event.target.checked)}
          >
            Связь с другим юнитом
          </Checkbox>
          <Checkbox
            checked={compareEnabled}
            disabled={!compareAvailable}
            onChange={(event) => onCompareEnabledChange(event.target.checked)}
          >
            Сравнить с предыдущей
          </Checkbox>
        </Flex>
      </Card>
    </Flex>
  );
};
