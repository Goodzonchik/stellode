import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FindApplicationsDto } from '@stellode/models';

export class FindApplicationsRequest implements FindApplicationsDto {
  @ApiPropertyOptional({ type: String, description: 'UUID юнита' })
  unitId?: string;
}
