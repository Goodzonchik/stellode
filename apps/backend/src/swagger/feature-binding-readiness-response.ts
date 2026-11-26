import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FeatureBindingReadinessReason,
  VersionStatus,
  type FeatureBindingReadiness,
} from '@stellode/models';

export class FeatureBindingReadinessResponse implements FeatureBindingReadiness {
  @ApiProperty({ type: String })
  applicationId!: string;

  @ApiProperty({ type: String })
  applicationName!: string;

  @ApiProperty({ type: String })
  componentId!: string;

  @ApiProperty({ type: String })
  componentName!: string;

  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  componentVersion!: string;

  @ApiProperty({
    type: String,
    description: 'Юнит приложения/компонента привязки (coalesce(app.unitId, cv.unitId))',
  })
  unitId!: string;

  @ApiPropertyOptional({
    enum: Object.values(VersionStatus),
    nullable: true,
    description: 'Статус на HAS_COMPONENT в current-релизе или null',
  })
  statusInRelease!: VersionStatus | null;

  @ApiProperty({ type: Boolean })
  ready!: boolean;

  @ApiProperty({ enum: Object.values(FeatureBindingReadinessReason) })
  reason!: FeatureBindingReadinessReason;
}
