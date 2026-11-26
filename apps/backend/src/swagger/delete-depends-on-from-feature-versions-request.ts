import { ApiProperty } from '@nestjs/swagger';
import type { DeleteDependsOnFromFeatureVersionsDto } from '@stellode/models';

export class DeleteDependsOnFromFeatureVersionsRequest
  implements DeleteDependsOnFromFeatureVersionsDto
{
  @ApiProperty({ type: String, description: 'Конец ребра — consumer ComponentVersion' })
  sourceComponentVersionId!: string;

  @ApiProperty({ type: String, description: 'Конец ребра — provider ComponentVersion' })
  targetComponentVersionId!: string;

  @ApiProperty({ type: String, description: 'Draft FeatureVersion — владелец копии DEPENDS_ON' })
  consumerFeatureVersionId!: string;

  @ApiProperty({ type: String, description: 'Из context ребра' })
  consumerApplicationId!: string;

  @ApiProperty({ type: String, description: 'Из context ребра' })
  providerApplicationId!: string;
}
