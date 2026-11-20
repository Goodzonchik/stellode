import type { DiagramMenuItem } from './diagram-context-menu.config';

type EdgeMenuParams = {
  readonly entity: string | undefined;
  readonly relationshipType: string;
  readonly isReadOnly: boolean;
};

export const buildEdgeContextMenuItems = (p: EdgeMenuParams): DiagramMenuItem[] => {
  if (p.entity !== 'feature-version') return [];
  if (p.isReadOnly) return [];
  if (p.relationshipType !== 'DEPENDS_ON') return [];
  return [
    {
      id: 'fv-delete-depends-on',
      label: 'Удалить связь',
      action: 'fvDeleteDependsOn',
    },
  ];
};
