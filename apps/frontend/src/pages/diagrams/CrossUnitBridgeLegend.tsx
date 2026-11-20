import { Card, Checkbox, Flex } from 'antd';

type Props = {
  readonly teamsVisible: boolean;
  readonly onTeamsVisibleChange: (visible: boolean) => void;
  readonly codeOnly: boolean;
  readonly onCodeOnlyChange: (codeOnly: boolean) => void;
};

export const CrossUnitBridgeLegend = ({
  teamsVisible,
  onTeamsVisibleChange,
  codeOnly,
  onCodeOnlyChange,
}: Props) => (
  <Card type="inner" size="small">
    <Flex vertical gap={8} style={{ width: '100%' }}>
      <Checkbox
        checked={teamsVisible}
        onChange={(event) => onTeamsVisibleChange(event.target.checked)}
      >
        Команды
      </Checkbox>
      <Checkbox
        checked={codeOnly}
        onChange={(event) => onCodeOnlyChange(event.target.checked)}
      >
        Только код
      </Checkbox>
    </Flex>
  </Card>
);
