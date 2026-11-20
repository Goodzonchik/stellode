import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FindFeaturesDto } from '@stellode/models';

export class FindFeaturesRequest implements FindFeaturesDto {
  @ApiPropertyOptional({ type: String, description: 'UUID юнита' })
  unitId?: string;
}
