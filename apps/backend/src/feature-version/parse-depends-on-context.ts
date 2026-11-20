import type { DependsOnContextDto } from '@stellode/models';

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const fromRecord = (record: Record<string, unknown>): DependsOnContextDto => ({
  consumerServiceId: asTrimmedString(record.consumerServiceId),
  providerServiceId: asTrimmedString(record.providerServiceId),
  consumerApplicationId: asTrimmedString(record.consumerApplicationId),
  providerApplicationId: asTrimmedString(record.providerApplicationId),
  consumerFeatureId: asTrimmedString(record.consumerFeatureId),
  consumerFeatureVersionId: asTrimmedString(record.consumerFeatureVersionId),
  providerFeatureId: asTrimmedString(record.providerFeatureId),
  providerFeatureVersionId: asTrimmedString(record.providerFeatureVersionId),
});

export const parseDependsOnContext = (raw: unknown): DependsOnContextDto => {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return fromRecord(raw as Record<string, unknown>);
  }
  if (typeof raw !== 'string' || raw.trim().length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return fromRecord(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
};
