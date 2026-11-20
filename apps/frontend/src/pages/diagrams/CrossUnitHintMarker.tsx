import type { CrossUnitHint, CrossUnitHintValue } from '@stellode/models';
import { QuestionCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import './CrossUnitHintMarker.css';

const formatHintValue = (value: CrossUnitHintValue): string =>
  typeof value === 'string' ? value : value.join(', ');

export const formatCrossUnitHintTitle = (hint: CrossUnitHint): string =>
  [
    `Юнит: ${formatHintValue(hint.unitName)}`,
    `Команда: ${formatHintValue(hint.teamName)}`,
    `Приложение: ${formatHintValue(hint.applicationName)}`,
    `Компонент: ${formatHintValue(hint.componentName)}`,
    `Фича: ${formatHintValue(hint.featureName)}`,
    `Сервис: ${formatHintValue(hint.serviceName)}`,
  ].join('\n');

export const CrossUnitHintMarker = (props: {
  readonly hint: CrossUnitHint;
  readonly className?: string;
}) => {
  const title = formatCrossUnitHintTitle(props.hint);
  return (
    <Tooltip title={<span className="cross-unit-hint-marker__tooltip">{title}</span>}>
      <QuestionCircleFilled
        className={['cross-unit-hint-marker', props.className].filter(Boolean).join(' ')}
        aria-label={title}
      />
    </Tooltip>
  );
};
