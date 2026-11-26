import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FeatureVersionReadinessReason,
  type CheckFeatureVersionReadyResult,
} from '@stellode/models';
import { FeatureBindingReadinessResponse } from './feature-binding-readiness-response';
import { FeatureVersionCheckSnapshotResponse } from './feature-version-check-snapshot-response';

export class CheckFeatureVersionReadyResponse implements CheckFeatureVersionReadyResult {
  @ApiProperty({
    type: FeatureVersionCheckSnapshotResponse,
    description: 'Снимок версии после возможной автопубликации',
  })
  featureVersion!: FeatureVersionCheckSnapshotResponse;

  @ApiProperty({
    type: Boolean,
    description:
      'true только если есть хотя бы одна USES, все bindings и crossUnitBindings готовы; пустой состав → false; пустой crossUnitBindings не блокирует',
  })
  readyToProduction!: boolean;

  @ApiPropertyOptional({
    enum: Object.values(FeatureVersionReadinessReason),
    nullable: true,
    description:
      'null — есть привязки или версия готова; no_component_bindings — нет исходящих USES',
  })
  reason!: FeatureVersionReadinessReason | null;

  @ApiProperty({
    type: [FeatureBindingReadinessResponse],
    description: 'Разбор по каждой привязке USES; [] при пустом составе',
  })
  bindings!: FeatureBindingReadinessResponse[];

  @ApiProperty({
    type: [FeatureBindingReadinessResponse],
    description:
      'Разбор по исходящим cross-unit DEPENDS_ON от CV состава; unitId — юнит поставщика; [] если рёбер нет',
  })
  crossUnitBindings!: FeatureBindingReadinessResponse[];
}
