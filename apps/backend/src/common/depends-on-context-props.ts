import type { DependsOnContextDto } from '@stellode/models';

const CONTEXT_KEYS = [
  'consumerServiceId',
  'consumerApplicationId',
  'consumerFeatureId',
  'consumerFeatureVersionId',
  'providerServiceId',
  'providerApplicationId',
  'providerFeatureId',
  'providerFeatureVersionId',
] as const;

export const dependsOnContextProps = (
  context: DependsOnContextDto,
): Record<string, string> =>
  Object.fromEntries(
    CONTEXT_KEYS.flatMap((key) => {
      const value = context[key];
      if (typeof value !== 'string' || value.length === 0) return [];
      return [[key, value] as const];
    }),
  );

export const dependsOnMatchKeysWhere = (alias: string): string =>
  `${alias}.consumerFeatureVersionId = $consumerFeatureVersionId
    AND ${alias}.consumerApplicationId = $consumerApplicationId
    AND ${alias}.providerApplicationId = $providerApplicationId`;

export const dependsOnMatchKeyParams = (
  context: DependsOnContextDto,
): {
  readonly consumerFeatureVersionId: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
} => ({
  consumerFeatureVersionId: context.consumerFeatureVersionId ?? '',
  consumerApplicationId: context.consumerApplicationId ?? '',
  providerApplicationId: context.providerApplicationId ?? '',
});

export const dependsOnContextsEqual = (
  left: DependsOnContextDto,
  right: DependsOnContextDto,
): boolean => CONTEXT_KEYS.every((key) => (left[key] ?? '') === (right[key] ?? ''));
