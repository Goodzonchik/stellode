import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FindTeamsDto } from '@stellode/models';

export class FindTeamsRequest implements FindTeamsDto {
  @ApiPropertyOptional({ type: String, description: 'UUID юнита' })
  unitId?: string;
}
