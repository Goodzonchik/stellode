import { ApiProperty } from '@nestjs/swagger';
import type { DeleteDependsOnFromFeatureVersionsDto } from '@stellode/models';

export class DeleteDependsOnFromFeatureVersionsRequest
  implements DeleteDependsOnFromFeatureVersionsDto
{
  @ApiProperty({ type: String })
  sourceComponentVersionId!: string;

  @ApiProperty({ type: String })
  targetComponentVersionId!: string;

  @ApiProperty({ type: String })
  consumerFeatureVersionId!: string;

  @ApiProperty({ type: String })
  consumerApplicationId!: string;

  @ApiProperty({ type: String })
  providerApplicationId!: string;
}
