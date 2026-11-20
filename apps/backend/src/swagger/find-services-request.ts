import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FindServicesDto } from '@stellode/models';

export class FindServicesRequest implements FindServicesDto {
  @ApiPropertyOptional({ type: String, description: 'UUID юнита' })
  unitId?: string;
}
