import {
  buildGroupNodeUnitAccentStyle,
  buildUnitGroupAccentCssVars,
  unitGroupAccentHash,
  unitGroupAccentHue,
} from './unit-group-accent';

describe('unitGroupAccentHash', () => {
  it('returns a stable unsigned value for the same unitId', () => {
    const first = unitGroupAccentHash('unit-crm');
    const second = unitGroupAccentHash('unit-crm');
    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
  });

  it('differs for typical pair unit ids', () => {
    const a = unitGroupAccentHash('11111111-1111-4111-8111-111111111111');
    const b = unitGroupAccentHash('22222222-2222-4222-8222-222222222222');
    expect(a).not.toBe(b);
  });

  it('differs for CoolUnit demo pair', () => {
    const coolUnit2 = unitGroupAccentHash('aae8e5d7-eb92-409a-8742-bf5394d12875');
    const coolUnit = unitGroupAccentHash('b237b352-0299-4a8b-8bd2-d2826be958d5');
    expect(coolUnit2).not.toBe(coolUnit);
  });
});

describe('unitGroupAccentHue', () => {
  it('returns a stable hue in 0..359', () => {
    const hue = unitGroupAccentHue('unit-crm');
    expect(hue).toBe(unitGroupAccentHue('unit-crm'));
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it('yields different hues for CoolUnit demo pair', () => {
    const coolUnit2 = unitGroupAccentHue('aae8e5d7-eb92-409a-8742-bf5394d12875');
    const coolUnit = unitGroupAccentHue('b237b352-0299-4a8b-8bd2-d2826be958d5');
    expect(coolUnit2).not.toBe(coolUnit);
  });
});

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
