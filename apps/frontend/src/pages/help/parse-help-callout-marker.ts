import { HelpCalloutType } from './help-callout-type';

const CALLOUT_MARKER =
  /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/i;

const isHelpCalloutType = (value: string): value is HelpCalloutType =>
  (Object.values(HelpCalloutType) as readonly string[]).includes(value);

export const parseHelpCalloutMarker = (text: string): HelpCalloutType | null => {
  const match = CALLOUT_MARKER.exec(text);
  if (match === null) {
    return null;
  }
  const type = match[1].toLowerCase();
  return isHelpCalloutType(type) ? type : null;
};
