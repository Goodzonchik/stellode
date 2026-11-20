import type { ReactNode } from 'react';
import { Card, Flex } from 'antd';

type Props = {
  readonly children: ReactNode;
};

export const DiagramLegendShell = ({ children }: Props) => (
  <aside className="diagram-legend-shell">
    <Card size="small" styles={{ body: { padding: 12 } }}>
      <Flex vertical gap={12} style={{ width: '100%' }}>
        {children}
      </Flex>
    </Card>
  </aside>
);
