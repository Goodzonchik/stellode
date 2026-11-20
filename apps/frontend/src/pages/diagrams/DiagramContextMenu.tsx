import { useEffect } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { DiagramContextAction, DiagramMenuItem } from './diagram-context-menu.config';

type DiagramContextMenuProps = {
  open: boolean;
  position: { x: number; y: number } | null;
  items: DiagramMenuItem[];
  onDismiss: () => void;
  onAction: (action: DiagramContextAction) => void;
};

const toMenuItems = (items: DiagramMenuItem[]): MenuProps['items'] =>
  items.map((item) => ({ key: item.id, label: item.label }));

const findAction = (
  items: DiagramMenuItem[],
  key: string,
): DiagramContextAction | undefined => items.find((item) => item.id === key)?.action;

export function DiagramContextMenu({
  open,
  position,
  items,
  onDismiss,
  onAction,
}: DiagramContextMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onDismiss]);

  if (!open || !position) return null;

  const menu: MenuProps = {
    items: toMenuItems(items),
    onClick: ({ key }) => {
      const action = findAction(items, String(key));
      if (action) onAction(action);
      onDismiss();
    },
  };

  return (
    <Dropdown
      open={items.length > 0}
      trigger={[]}
      menu={menu}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
      styles={{
        root: {
          position: 'fixed',
          left: position.x,
          top: position.y,
        },
      }}
    >
      <span
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />
    </Dropdown>
  );
}
