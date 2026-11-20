import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateApplicationDto } from '@stellode/models';

export class CreateApplicationRequest implements CreateApplicationDto {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, description: 'UUID юнита' })
  unitId!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
