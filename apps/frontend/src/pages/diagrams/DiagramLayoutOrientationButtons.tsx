import { ApartmentOutlined, PartitionOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { LayoutDirection } from './layout-direction';

type DiagramLayoutOrientationButtonsProps = {
  readonly onLayout: (direction: LayoutDirection) => void;
};

export const DiagramLayoutOrientationButtons = ({
  onLayout,
}: DiagramLayoutOrientationButtonsProps) => (
  <>
    <Button
      htmlType="button"
      icon={<ApartmentOutlined />}
      title="Вертикальная раскладка (сверху вниз)"
      aria-label="Вертикальная раскладка"
      onClick={() => onLayout('TB')}
    />
    <Button
      htmlType="button"
      icon={<PartitionOutlined />}
      title="Горизонтальная раскладка (слева направо)"
      aria-label="Горизонтальная раскладка"
      onClick={() => onLayout('LR')}
    />
  </>
);
