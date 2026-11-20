export type DiagramContextAction =
  | 'createComponent'
  | 'addComponent'
  | 'showImpact'
  | 'openInList'
  | 'fvRemoveUses'
  | 'fvReplaceUses'
  | 'fvAddSecondUses'
  | 'fvAddDependsOn'
  | 'fvDeleteDependsOn'
  | 'crossUnitDependsOn'
  | 'serviceAddFeature'
  | 'serviceRemoveFeature';

export type PaneDiagramMenuAction =
  | 'createComponent'
  | 'addComponent'
  | 'serviceAddFeature';

export interface DiagramMenuItem {
  id: string;
  label: string;
  action: DiagramContextAction;
}

const createComponentItem: DiagramMenuItem = {
  id: 'create-component',
  label: 'Создать компонент',
  action: 'createComponent',
};

const addComponentItem: DiagramMenuItem = {
  id: 'add-component',
  label: 'Добавить компонент',
  action: 'addComponent',
};

const addFeatureToServiceItem: DiagramMenuItem = {
  id: 'service-add-feature',
  label: 'Добавить фичу',
  action: 'serviceAddFeature',
};

export const diagramContextMenuByEntity: Record<string, DiagramMenuItem[]> = {
  default: [createComponentItem],
  component: [createComponentItem, addComponentItem],
  team: [createComponentItem],
  applicationVersion: [createComponentItem],
  feature: [createComponentItem],
  'feature-version': [createComponentItem, addComponentItem],
  service: [addFeatureToServiceItem],
};

export const getDiagramContextMenuItems = (entity?: string): DiagramMenuItem[] =>
  diagramContextMenuByEntity[entity ?? ''] ?? diagramContextMenuByEntity.default;
