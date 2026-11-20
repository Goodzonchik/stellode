import { ApiProperty } from '@nestjs/swagger';
import type { GetFeatureVersionsDto } from '@stellode/models';

export class GetFeatureVersionsRequest implements GetFeatureVersionsDto {
  @ApiProperty({ type: String })
  featureElementId!: string;
}
