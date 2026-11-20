import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RaiseFeatureComponentVersionDto } from '@stellode/models';

export class RaiseFeatureComponentVersionRequest implements RaiseFeatureComponentVersionDto {
  @ApiProperty({ type: String })
  featureVersionId!: string;

  @ApiProperty({ type: String })
  fromComponentVersionId!: string;

  @ApiProperty({ type: String })
  applicationId!: string;

  @ApiPropertyOptional({ type: String })
  toComponentVersionId?: string;
}
