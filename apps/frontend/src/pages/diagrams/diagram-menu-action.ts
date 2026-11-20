import type { PaneDiagramMenuAction } from './diagram-context-menu.config';

export type DiagramMenuActionHandlers = {
  closeMenu: () => void;
  openCreateDialog: () => void;
  openAddComponentDialog: () => void;
  openAddFeatureToServiceDialog: () => void;
};

const paneDiagramMenuActionHandlers: Record<
  PaneDiagramMenuAction,
  (handlers: DiagramMenuActionHandlers) => void
> = {
  createComponent: (handlers) => handlers.openCreateDialog(),
  addComponent: (handlers) => handlers.openAddComponentDialog(),
  serviceAddFeature: (handlers) => handlers.openAddFeatureToServiceDialog(),
};

export const runPaneDiagramMenuAction = (
  action: PaneDiagramMenuAction,
  h: DiagramMenuActionHandlers,
): void => {
  h.closeMenu();
  paneDiagramMenuActionHandlers[action](h);
};
