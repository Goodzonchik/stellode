import { buildGroupNodeUnitAccentStyle } from './build-group-node-unit-accent-style';
import { buildUnitGroupAccentCssVars } from './build-unit-group-accent-css-vars';

describe('buildGroupNodeUnitAccentStyle', () => {
  it('returns css vars from data.unitId for unit group', () => {
    const unitId = 'unit-crm';
    const style = buildGroupNodeUnitAccentStyle('ignored-rf-id', {
      label: 'CRM',
      type: 'unit',
      unitId,
    });
    expect(style).toEqual(buildUnitGroupAccentCssVars(unitId));
  });

  it('falls back to node id when unitId is missing', () => {
    const id = 'b237b352-0299-4a8b-8bd2-d2826be958d5';
    const style = buildGroupNodeUnitAccentStyle(id, { label: 'CoolUnit', type: 'unit' });
    expect(style).toEqual(buildUnitGroupAccentCssVars(id));
  });

  it('returns undefined for application group', () => {
    const style = buildGroupNodeUnitAccentStyle('app-1', {
      label: 'App',
      type: 'app',
    });
    expect(style).toBeUndefined();
  });
});
