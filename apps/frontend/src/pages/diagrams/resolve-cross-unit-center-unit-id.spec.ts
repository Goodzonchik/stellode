import { resolveCrossUnitCenterUnitId } from './resolve-cross-unit-center-unit-id';

const validA = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const validB = '11111111-2222-4333-8444-555555555555';

describe('resolveCrossUnitCenterUnitId', () => {
  it('prefers trimmed fromUnit when valid uuid', () => {
    expect(resolveCrossUnitCenterUnitId(`  ${validA}  `, validB)).toBe(validA);
  });

  it('falls back to context when fromUnit missing', () => {
    expect(resolveCrossUnitCenterUnitId(null, validB)).toBe(validB);
  });

  it('falls back to context when fromUnit invalid', () => {
    expect(resolveCrossUnitCenterUnitId('not-a-uuid', validB)).toBe(validB);
  });

  it('returns null when both missing', () => {
    expect(resolveCrossUnitCenterUnitId(null, undefined)).toBeNull();
    expect(resolveCrossUnitCenterUnitId('   ', undefined)).toBeNull();
  });

  it('returns null when fromUnit invalid and no context', () => {
    expect(resolveCrossUnitCenterUnitId('x', undefined)).toBeNull();
  });
});
