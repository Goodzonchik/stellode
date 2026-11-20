import { buildUnitGroupAccentCssVars } from './build-unit-group-accent-css-vars';
import { unitGroupAccentHue } from './unit-group-accent-hue';

describe('buildUnitGroupAccentCssVars', () => {
  it('builds hsl css vars from unitId hue', () => {
    const unitId = 'unit-crm';
    const hue = unitGroupAccentHue(unitId);
    const vars = buildUnitGroupAccentCssVars(unitId);
    expect(vars['--group-node-accent']).toBe(`hsl(${hue} 72% 36%)`);
    expect(vars['--group-node-bg']).toBe(`hsl(${hue} 72% 45% / 0.1)`);
    expect(vars['--group-node-header-bg']).toBe(`hsl(${hue} 72% 45% / 0.2)`);
    expect(vars['--group-node-header-border']).toBe(`hsl(${hue} 72% 36% / 0.65)`);
  });

  it('differs for two unit ids', () => {
    const a = buildUnitGroupAccentCssVars('aae8e5d7-eb92-409a-8742-bf5394d12875');
    const b = buildUnitGroupAccentCssVars('b237b352-0299-4a8b-8bd2-d2826be958d5');
    expect(a['--group-node-accent']).not.toBe(b['--group-node-accent']);
  });
});
