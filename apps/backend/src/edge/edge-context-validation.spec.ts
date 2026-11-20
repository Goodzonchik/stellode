import { BadRequestException } from '@nestjs/common';
import { EdgeWarningCode } from '@stellode/models';
import {
  assertContextSideComplete,
  buildDependsOnStatusWarnings,
  contextHasBusinessKeys,
} from './edge-context-validation';

describe('contextHasBusinessKeys', () => {
  it('returns false for undefined', () => {
    expect(contextHasBusinessKeys(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(contextHasBusinessKeys({})).toBe(false);
  });

  it('returns true when a field is filled', () => {
    expect(contextHasBusinessKeys({ consumerApplicationId: 'app-1' })).toBe(true);
  });

  it('returns false when fields are whitespace', () => {
    expect(contextHasBusinessKeys({ consumerApplicationId: '  ' })).toBe(false);
  });
});

describe('assertContextSideComplete', () => {
  it('throws when all four are empty', () => {
    expect(() =>
      assertContextSideComplete([undefined, undefined, undefined, undefined], 'consumer'),
    ).toThrow(BadRequestException);
  });

  it('does not throw when all four are filled', () => {
    expect(() =>
      assertContextSideComplete(['a', 'b', 'c', 'd'], 'consumer'),
    ).not.toThrow();
  });

  it('throws when application is empty but other ids are filled', () => {
    expect(() => assertContextSideComplete(['a', undefined, 'c', 'd'], 'consumer')).toThrow(
      BadRequestException,
    );
  });

  it('throws when core ids are partially filled', () => {
    expect(() => assertContextSideComplete(['a', 'b', 'c', undefined], 'provider')).toThrow(
      BadRequestException,
    );
  });

  it('throws when only application is filled', () => {
    expect(() => assertContextSideComplete([undefined, 'b', undefined, undefined], 'provider')).toThrow(
      BadRequestException,
    );
  });

  it('treats whitespace-only fields as empty', () => {
    expect(() => assertContextSideComplete(['a', '  ', 'c', 'd'], 'consumer')).toThrow(
      BadRequestException,
    );
  });
});

describe('buildDependsOnStatusWarnings', () => {
  it('returns empty for unknown statuses', () => {
    expect(buildDependsOnStatusWarnings('x', 'y')).toEqual([]);
  });

  it('returns ACTIVE_TO_DRAFT', () => {
    const w = buildDependsOnStatusWarnings('active', 'draft');
    expect(w).toHaveLength(1);
    expect(w[0]?.code).toBe(EdgeWarningCode.ActiveToDraft);
  });

  it('returns ACTIVE_TO_DEPRECATED', () => {
    const w = buildDependsOnStatusWarnings('active', 'deprecated');
    expect(w[0]?.code).toBe(EdgeWarningCode.ActiveToDeprecated);
  });
});
