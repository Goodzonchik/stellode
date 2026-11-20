import { ApiProperty } from '@nestjs/swagger';
import type { CheckFeatureVersionReadyDto } from '@stellode/models';

export class CheckFeatureVersionReadyRequest implements CheckFeatureVersionReadyDto {
  @ApiProperty({ type: String })
  featureVersionId!: string;
}
