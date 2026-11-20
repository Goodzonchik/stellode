import { Card, Checkbox, Flex } from 'antd';
import Legend from './Legend';
import type { Legend as LegendData } from './get-legend';

type Props = {
  readonly data: LegendData;
  readonly codeOnly: boolean;
  readonly onCodeOnlyChange: (codeOnly: boolean) => void;
};

const legendForCodeOnly = (data: LegendData, codeOnly: boolean): LegendData =>
  codeOnly
    ? { application: data.application, features: [], services: [] }
    : data;

export const TeamDiagramLegend = ({ data, codeOnly, onCodeOnlyChange }: Props) => (
  <Flex vertical gap={12} style={{ width: '100%' }}>
    <Card type="inner" size="small">
      <Checkbox
        checked={codeOnly}
        onChange={(event) => onCodeOnlyChange(event.target.checked)}
      >
        Только код
      </Checkbox>
    </Card>
    <Legend data={legendForCodeOnly(data, codeOnly)} />
  </Flex>
);
