import type { ArchitectureGraph } from '@stellode/models';
import type { DiagramMenuItem } from './diagram-context-menu.config';
import { resolveImpactHttpTarget } from './resolve-impact-api-target';
import { resolveOpenInListTarget } from './resolve-open-in-list-target';
import { isServiceArchived, isServiceDiagramEntity } from './service-diagram-entity';

type NodeMenuParams = {
  graph: ArchitectureGraph | null;
  entity: string | undefined;
  diagramAnchorId: string | undefined;
  nodeId: string;
  currentUnitId?: string;
  isFlatComponent?: boolean;
};

const hasActiveAggregate = (
  graph: ArchitectureGraph,
  serviceId: string,
  featureId: string,
): boolean =>
  graph.relationships.some(
    (r) =>
      r.type === 'AGGREGATES' &&
      r.from === serviceId &&
      r.to === featureId &&
      r.properties?.deleted !== true,
  );

export const buildNodeContextMenuItems = (p: NodeMenuParams): DiagramMenuItem[] => {
  const items: DiagramMenuItem[] = [];
  if (p.graph && resolveOpenInListTarget(p.graph, p.nodeId, p.currentUnitId ?? '') !== null) {
    items.push({ id: 'open-in-list', label: 'Открыть в списке', action: 'openInList' });
  }
  const impactAllowed = p.entity !== 'unit' && p.graph && resolveImpactHttpTarget(p.graph, p.nodeId);
  if (impactAllowed) {
    items.push({ id: 'impact', label: 'Показать влияние', action: 'showImpact' });
  }
  const serviceArchived = isServiceArchived(p.graph, p.diagramAnchorId);
  if (
    isServiceDiagramEntity(p.entity) &&
    !serviceArchived &&
    p.graph &&
    p.diagramAnchorId &&
    p.graph.nodes.find((n) => n.id === p.nodeId)?.labels.includes('Feature') &&
    hasActiveAggregate(p.graph, p.diagramAnchorId, p.nodeId)
  ) {
    items.push({ id: 'service-remove-feature', label: 'Снять фичу', action: 'serviceRemoveFeature' });
  }
  if (p.entity !== 'feature-version' || !p.graph || !p.diagramAnchorId) return items;
  const anchor = p.graph.nodes.find((n) => n.id === p.diagramAnchorId);
  const clicked = p.graph.nodes.find((n) => n.id === p.nodeId);
  const draft = anchor?.labels.includes('FeatureVersion') && anchor.status === 'draft';
  const cv = clicked?.labels.includes('ComponentVersion');
  if (!draft || !cv || p.isFlatComponent === true) return items;
  items.push({
    id: 'fv-add-depends-on',
    label: 'Добавить связь',
    action: 'fvAddDependsOn',
  });
  items.push({
    id: 'fv-cross-unit',
    label: 'Связь с другим юнитом',
    action: 'crossUnitDependsOn',
  });
  if (clicked.status !== 'draft') {
    items.push({
      id: 'fv-raise-version',
      label: 'Поднять версию',
      action: 'fvReplaceUses',
    });
  }
  items.push({
    id: 'fv-exclude',
    label: 'Исключить из фичи',
    action: 'fvRemoveUses',
  });
  return items;
};
