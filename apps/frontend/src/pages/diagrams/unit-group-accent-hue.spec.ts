import { unitGroupAccentHue } from './unit-group-accent-hue';

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
