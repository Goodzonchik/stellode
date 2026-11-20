import { unitGroupAccentHash } from './unit-group-accent-hash';

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
