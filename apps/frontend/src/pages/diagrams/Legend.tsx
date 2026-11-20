import { memo } from 'react';
import { Card, Checkbox, Collapse, Flex, Typography } from 'antd';
import { UnitDiagramNodeKind } from './unit-diagram-type-visibility';
import './diagram-legend.css';

interface LegendItem {
  id?: string;
  name: string;
  isActive?: boolean;
}

const unitTypeLabels: Record<Exclude<UnitDiagramNodeKind, 'unit'>, string> = {
  [UnitDiagramNodeKind.Team]: 'Команды',
  [UnitDiagramNodeKind.Service]: 'Услуги',
  [UnitDiagramNodeKind.Feature]: 'Фичи',
  [UnitDiagramNodeKind.App]: 'Приложения',
  [UnitDiagramNodeKind.Component]: 'Компоненты',
};

const unitTypeToggleOrder: readonly Exclude<UnitDiagramNodeKind, 'unit'>[] = [
  UnitDiagramNodeKind.Team,
  UnitDiagramNodeKind.Component,
  UnitDiagramNodeKind.Service,
  UnitDiagramNodeKind.Feature,
  UnitDiagramNodeKind.App,
];

interface AccordionItemProps {
  title: string;
  items: LegendItem[];
  itemType: string;
}

interface LegendProps {
  data?: {
    application?: LegendItem[];
    features?: LegendItem[];
    services?: LegendItem[];
  } | null;
  unitTypeVisibility?: Record<UnitDiagramNodeKind, boolean>;
  onUnitTypeVisibilityChange?: (kind: UnitDiagramNodeKind, visible: boolean) => void;
  unitTypeToggleKinds?: readonly Exclude<UnitDiagramNodeKind, 'unit'>[];
}

const AccordionItem = memo(({ title, items, itemType }: AccordionItemProps) => (
  <Collapse
    defaultActiveKey={[itemType]}
    size="small"
    items={[
      {
        key: itemType,
        label: title,
        children:
          items.length > 0 ? (
            <ul className="diagram-legend-list">
              {items.map((item) => (
                <li
                  key={`${itemType}-${item.id || item.name}`}
                  className="diagram-legend-list__item"
                >
                  {item.isActive ? (
                    <Typography.Text type="danger" strong>
                      {item.name}
                    </Typography.Text>
                  ) : (
                    <Typography.Text>{item.name}</Typography.Text>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Typography.Text type="secondary">Ничего не найдено</Typography.Text>
          ),
      },
    ]}
  />
));

const UnitTypeFilters = memo(
  ({
    visibility,
    onChange,
    toggleKinds,
  }: {
    visibility: Record<UnitDiagramNodeKind, boolean>;
    onChange: (kind: UnitDiagramNodeKind, visible: boolean) => void;
    toggleKinds: readonly Exclude<UnitDiagramNodeKind, 'unit'>[];
  }) => (
    <Card type="inner" size="small" title="Типы на диаграмме">
      <Flex vertical gap={8} style={{ width: '100%' }}>
        {toggleKinds.map((kind) => (
          <Checkbox
            key={kind}
            checked={visibility[kind]}
            onChange={(event) => onChange(kind, event.target.checked)}
          >
            {unitTypeLabels[kind]}
          </Checkbox>
        ))}
      </Flex>
    </Card>
  ),
);

export default memo(
  ({
    data,
    unitTypeVisibility,
    onUnitTypeVisibilityChange,
    unitTypeToggleKinds,
  }: LegendProps) => {
    if (unitTypeVisibility && onUnitTypeVisibilityChange) {
      return (
        <UnitTypeFilters
          visibility={unitTypeVisibility}
          onChange={onUnitTypeVisibilityChange}
          toggleKinds={unitTypeToggleKinds ?? unitTypeToggleOrder}
        />
      );
    }

    const sections = [
      {
        title: 'Приложения',
        items: data?.application || [],
        itemType: 'app',
      },
      {
        title: 'Фичи',
        items: data?.features || [],
        itemType: 'feature',
      },
      {
        title: 'Услуги',
        items: data?.services || [],
        itemType: 'service',
      },
    ].filter((section) => section.items.length > 0);

    return (
      <Flex vertical gap={12} style={{ width: '100%' }}>
        {sections.map((section) => (
          <AccordionItem
            key={section.itemType}
            title={section.title}
            items={section.items}
            itemType={section.itemType}
          />
        ))}
      </Flex>
    );
  },
);
