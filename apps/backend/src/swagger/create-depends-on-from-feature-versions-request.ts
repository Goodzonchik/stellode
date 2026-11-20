import { ApiProperty } from '@nestjs/swagger';
import type { CreateDependsOnFromFeatureVersionsDto } from '@stellode/models';

export class CreateDependsOnFromFeatureVersionsRequest implements CreateDependsOnFromFeatureVersionsDto {
  @ApiProperty({ type: String })
  sourceComponentVersionId!: string;

  @ApiProperty({ type: String })
  targetComponentVersionId!: string;

  @ApiProperty({ type: String })
  consumerFeatureVersionId!: string;

  @ApiProperty({ type: String })
  providerFeatureVersionId!: string;

  @ApiProperty({ type: String })
  consumerApplicationId!: string;

  @ApiProperty({ type: String })
  providerApplicationId!: string;
}
