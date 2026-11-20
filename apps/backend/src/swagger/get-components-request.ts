import { ApiPropertyOptional } from '@nestjs/swagger';
import type { GetComponentsDto } from '@stellode/models';

export class GetComponentsRequest implements GetComponentsDto {
  @ApiPropertyOptional({ type: String, description: 'UUID юнита' })
  unitId?: string;
}
