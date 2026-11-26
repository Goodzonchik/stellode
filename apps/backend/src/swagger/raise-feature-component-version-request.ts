import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RaiseFeatureComponentVersionDto } from '@stellode/models';

export class RaiseFeatureComponentVersionRequest implements RaiseFeatureComponentVersionDto {
  @ApiProperty({ type: String, description: 'Черновик FeatureVersion' })
  featureVersionId!: string;

  @ApiProperty({ type: String, description: 'Текущая цель USES_COMPONENT_VERSION' })
  fromComponentVersionId!: string;

  @ApiProperty({ type: String, description: 'USES.applicationId кликнутой ноды' })
  applicationId!: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Целевая ComponentVersion; если нет — создаётся новая draft CV у того же Component',
  })
  toComponentVersionId?: string;
}
