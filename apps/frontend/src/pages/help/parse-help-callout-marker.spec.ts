import { parseHelpCalloutMarker } from './parse-help-callout-marker';

describe('parseHelpCalloutMarker', () => {
  it('parses typed markers on their own line', () => {
    expect(parseHelpCalloutMarker('[!WARNING]\ntext')).toBe('warning');
    expect(parseHelpCalloutMarker('[!NOTE]\n')).toBe('note');
    expect(parseHelpCalloutMarker('[!TIP]')).toBe('tip');
  });

  it('rejects same-line body after marker', () => {
    expect(parseHelpCalloutMarker('[!TIP] alone')).toBeNull();
  });

  it('rejects plain blockquote text', () => {
    expect(parseHelpCalloutMarker('plain note')).toBeNull();
  });
});
