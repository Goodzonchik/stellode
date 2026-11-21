import { HelpCalloutType } from './help-callout-type';

const LABELS: Readonly<Record<HelpCalloutType, string>> = {
  [HelpCalloutType.note]: 'Заметка',
  [HelpCalloutType.tip]: 'Совет',
  [HelpCalloutType.important]: 'Важно',
  [HelpCalloutType.warning]: 'Внимание',
  [HelpCalloutType.caution]: 'Осторожно',
};

export const helpCalloutLabel = (type: HelpCalloutType): string => LABELS[type];
