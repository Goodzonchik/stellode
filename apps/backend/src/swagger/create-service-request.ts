import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateServiceDto } from '@stellode/models';

export class CreateServiceRequest implements CreateServiceDto {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, description: 'UUID юнита' })
  unitId!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
