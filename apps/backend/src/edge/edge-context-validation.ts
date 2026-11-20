import { BadRequestException } from '@nestjs/common';
import { EdgeWarningCode, parseVersionStatus, VersionStatus } from '@stellode/models';
import type { DependsOnContextDto, EdgeWarningDto } from '@stellode/models';

export const contextHasBusinessKeys = (context: DependsOnContextDto | undefined): boolean => {
  if (context === undefined) return false;
  return Object.values(context).some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
};

const isFilled = (value: string | undefined): boolean => value !== undefined && value.trim() !== '';

export const assertContextSideComplete = (
  values: ReadonlyArray<string | undefined>,
  side: 'consumer' | 'provider',
): void => {
  const serviceId = values[0];
  const applicationId = values[1];
  const featureId = values[2];
  const featureVersionId = values[3];
  const allFilled = [serviceId, applicationId, featureId, featureVersionId].every(isFilled);
  if (!allFilled) {
    throw new BadRequestException(
      `Контекст ${side} должен включать идентификаторы service, application, feature и featureVersion`,
    );
  }
};

export const buildDependsOnStatusWarnings = (
  sourceStatusRaw: unknown,
  targetStatusRaw: unknown,
): EdgeWarningDto[] => {
  const sourceStatus = parseVersionStatus(sourceStatusRaw);
  const targetStatus = parseVersionStatus(targetStatusRaw);
  if (!sourceStatus || !targetStatus) return [];
  if (sourceStatus === VersionStatus.Active && targetStatus === VersionStatus.Draft) {
    return [
      {
        code: EdgeWarningCode.ActiveToDraft,
        message: 'DEPENDS_ON active -> draft should be reviewed (spec §10)',
      },
    ];
  }
  if (sourceStatus === VersionStatus.Active && targetStatus === VersionStatus.Deprecated) {
    return [
      {
        code: EdgeWarningCode.ActiveToDeprecated,
        message: 'DEPENDS_ON active -> deprecated is allowed with warning (spec §10)',
      },
    ];
  }
  if (sourceStatus === VersionStatus.Deprecated && targetStatus === VersionStatus.Draft) {
    return [
      {
        code: EdgeWarningCode.DeprecatedToDraft,
        message: 'DEPENDS_ON deprecated -> draft should be reviewed (spec §10)',
      },
    ];
  }
  if (sourceStatus === VersionStatus.Deprecated && targetStatus === VersionStatus.Deprecated) {
    return [
      {
        code: EdgeWarningCode.DeprecatedToDeprecated,
        message: 'DEPENDS_ON deprecated -> deprecated should be reviewed (spec §10)',
      },
    ];
  }
  if (sourceStatus === VersionStatus.Active && targetStatus === VersionStatus.Unactive) {
    return [
      {
        code: EdgeWarningCode.ActiveToUnactive,
        message: 'DEPENDS_ON active -> unactive is critical warning (spec §10)',
      },
    ];
  }
  if (sourceStatus === VersionStatus.Deprecated && targetStatus === VersionStatus.Unactive) {
    return [
      {
        code: EdgeWarningCode.DeprecatedToUnactive,
        message: 'DEPENDS_ON deprecated -> unactive is critical warning (spec §10)',
      },
    ];
  }
  return [];
};
