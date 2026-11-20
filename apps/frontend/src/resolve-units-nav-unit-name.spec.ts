import { resolveUnitsNavUnitName } from './resolve-units-nav-unit-name';

describe('resolveUnitsNavUnitName', () => {
  it('returns null when unit name is missing', () => {
    expect(resolveUnitsNavUnitName(null)).toBeNull();
    expect(resolveUnitsNavUnitName(undefined)).toBeNull();
    expect(resolveUnitsNavUnitName('')).toBeNull();
    expect(resolveUnitsNavUnitName('   ')).toBeNull();
  });

  it('returns trimmed unit name when present', () => {
    expect(resolveUnitsNavUnitName('CRM-Unit')).toBe('CRM-Unit');
    expect(resolveUnitsNavUnitName('  CRM-Unit  ')).toBe('CRM-Unit');
  });
});
