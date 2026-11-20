import { memo, useState, type MouseEvent, type ReactNode } from 'react';
import { Card, Checkbox, Collapse, Flex, Input, Typography } from 'antd';
import type {
  UnitDiagramFilterCatalog,
  UnitDiagramFilterItem,
  UnitDiagramFilterKind,
  UnitDiagramInstanceFilter,
} from './unit-diagram-instance-filter-types';
import { UnitDiagramFilterKind as Kind } from './unit-diagram-instance-filter-types';
import { setUnitDiagramKindHidden } from './set-unit-diagram-kind-hidden';
import { toggleUnitDiagramHiddenId } from './toggle-unit-diagram-hidden-id';
import { unitDiagramMasterCheckboxState } from './unit-diagram-master-checkbox-state';

const sectionOrder: readonly UnitDiagramFilterKind[] = [
  Kind.Team,
  Kind.Component,
  Kind.Service,
  Kind.Feature,
  Kind.App,
];

const sectionLabels: Record<UnitDiagramFilterKind, string> = {
  [Kind.Team]: 'Команды',
  [Kind.Component]: 'Компоненты',
  [Kind.Service]: 'Услуги',
  [Kind.Feature]: 'Фичи',
  [Kind.App]: 'Приложения',
};

const SEARCH_THRESHOLD = 10;

const matchesSearch = (label: string, query: string): boolean =>
  query.length === 0 || label.toLowerCase().includes(query.toLowerCase());

type SectionProps = {
  kind: UnitDiagramFilterKind;
  items: readonly UnitDiagramFilterItem[];
  filter: UnitDiagramInstanceFilter;
  onFilterChange: (next: UnitDiagramInstanceFilter) => void;
};

const stopHeaderToggle = (event: MouseEvent): void => {
  event.stopPropagation();
};

const UnitDiagramFilterSectionLabel = memo(
  ({ kind, items, filter, onFilterChange }: SectionProps) => {
    const hiddenIds = filter.hiddenIds[kind];
    const masterState = unitDiagramMasterCheckboxState(
      items.map((item) => item.id),
      hiddenIds,
    );

    const onMasterChange = () => {
      const hideAll = masterState === 'checked';
      onFilterChange(setUnitDiagramKindHidden(filter, kind, items.map((item) => item.id), hideAll));
    };

    return (
      <span onClick={stopHeaderToggle} onKeyDown={(event) => event.stopPropagation()}>
        <Checkbox
          checked={masterState === 'checked'}
          indeterminate={masterState === 'indeterminate'}
          onChange={onMasterChange}
          onClick={stopHeaderToggle}
        >
          {sectionLabels[kind]}
        </Checkbox>
      </span>
    );
  },
);

const UnitDiagramFilterSectionBody = memo(
  ({ kind, items, filter, onFilterChange }: SectionProps) => {
    const [search, setSearch] = useState('');
    const hiddenIds = filter.hiddenIds[kind];
    const visibleItems = items.filter((item) => matchesSearch(item.label, search));

    return (
      <Flex vertical gap={8} style={{ width: '100%' }}>
        {items.length > SEARCH_THRESHOLD ? (
          <Input
            allowClear
            size="small"
            value={search}
            placeholder="Поиск…"
            onChange={(event) => setSearch(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        ) : null}
        {visibleItems.map((item) => (
          <Checkbox
            key={item.id}
            checked={!hiddenIds.has(item.id)}
            onChange={() => onFilterChange(toggleUnitDiagramHiddenId(filter, kind, item.id))}
          >
            {item.label}
          </Checkbox>
        ))}
        {visibleItems.length === 0 ? (
          <Typography.Text type="secondary">Ничего не найдено</Typography.Text>
        ) : null}
      </Flex>
    );
  },
);

type Props = {
  catalog: UnitDiagramFilterCatalog;
  filter: UnitDiagramInstanceFilter;
  onFilterChange: (next: UnitDiagramInstanceFilter) => void;
};

const buildCollapseItems = (
  catalog: UnitDiagramFilterCatalog,
  filter: UnitDiagramInstanceFilter,
  onFilterChange: (next: UnitDiagramInstanceFilter) => void,
): { key: string; label: ReactNode; children: ReactNode }[] =>
  sectionOrder.flatMap((kind) => {
    const items = catalog[kind];
    if (items.length === 0) return [];
    const sectionProps: SectionProps = { kind, items, filter, onFilterChange };
    return [
      {
        key: kind,
        label: <UnitDiagramFilterSectionLabel {...sectionProps} />,
        children: <UnitDiagramFilterSectionBody {...sectionProps} />,
      },
    ];
  });

export const UnitDiagramInstanceFilters = memo(({ catalog, filter, onFilterChange }: Props) => (
  <Card type="inner" size="small" title="Фильтры на диаграмме">
    <Collapse
      size="small"
      defaultActiveKey={[]}
      items={buildCollapseItems(catalog, filter, onFilterChange)}
    />
  </Card>
));
