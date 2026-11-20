import type { ViewNode } from '@stellode/models';
import { UnitDiagramNodeKind, viewNodeUnitKind } from './unit-diagram-type-visibility';

export interface LegendItem {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Legend {
  application: LegendItem[];
  features: LegendItem[];
  services: LegendItem[];
}

const appendUnique = (items: LegendItem[], info: LegendItem): LegendItem[] =>
  items.some((item) => item.id === info.id) ? items : [...items, info];

const appendLegend = (acc: Legend, node: ViewNode): Legend => {
  if (node.hidden === true) return acc;
  const kind = viewNodeUnitKind(node);
  const info = getDataInfo(node);
  if (kind === UnitDiagramNodeKind.App) {
    return { ...acc, application: appendUnique(acc.application, info) };
  }
  if (kind === UnitDiagramNodeKind.Feature) {
    return { ...acc, features: appendUnique(acc.features, info) };
  }
  if (kind === UnitDiagramNodeKind.Service) {
    return { ...acc, services: appendUnique(acc.services, info) };
  }
  return acc;
};

export function getLegend(nodes: ViewNode[], _mainUnitId: string | undefined): Legend {
  void _mainUnitId;
  const empty: Legend = { application: [], features: [], services: [] };
  return nodes.reduce((acc, node) => appendLegend(acc, node), empty);
}

function getDataInfo(node: ViewNode): LegendItem {
  return {
    id: node.id,
    name: node.data.label,
    isActive: false,
  };
}
