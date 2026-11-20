import {
  FeatureBindingReadinessReason,
  parseVersionStatus,
  type FeatureBindingReadiness,
} from '@stellode/models';
import { resolveBindingReadinessReason } from './resolve-binding-readiness-reason';

export type RawBindingReadinessRow = {
  readonly applicationId: unknown;
  readonly applicationName: unknown;
  readonly componentId: unknown;
  readonly componentName: unknown;
  readonly componentVersionId: unknown;
  readonly componentVersion: unknown;
  readonly unitId: unknown;
  readonly hasCurrentRelease: unknown;
  readonly statusInRelease: unknown;
};

const toTrimmedString = (value: unknown): string => String(value ?? '').trim();

export const toFeatureBindingReadiness = (row: RawBindingReadinessRow): FeatureBindingReadiness => {
  const hasCurrentRelease = row.hasCurrentRelease === true;
  const reason = resolveBindingReadinessReason({
    hasCurrentRelease,
    statusInRelease: row.statusInRelease,
  });
  const statusInRelease = parseVersionStatus(row.statusInRelease);
  return {
    applicationId: toTrimmedString(row.applicationId),
    applicationName: toTrimmedString(row.applicationName),
    componentId: toTrimmedString(row.componentId),
    componentName: toTrimmedString(row.componentName),
    componentVersionId: toTrimmedString(row.componentVersionId),
    componentVersion: toTrimmedString(row.componentVersion),
    unitId: toTrimmedString(row.unitId),
    statusInRelease,
    ready: reason === FeatureBindingReadinessReason.Ready,
    reason,
  };
};
