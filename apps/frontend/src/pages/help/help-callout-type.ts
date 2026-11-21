export const HelpCalloutType = {
  note: 'note',
  tip: 'tip',
  important: 'important',
  warning: 'warning',
  caution: 'caution',
} as const;

export type HelpCalloutType = (typeof HelpCalloutType)[keyof typeof HelpCalloutType];
