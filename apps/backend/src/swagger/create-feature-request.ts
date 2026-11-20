import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateFeatureDto } from '@stellode/models';

export class CreateFeatureRequest implements CreateFeatureDto {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, description: 'UUID юнита' })
  unitId!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'UUID сервисов' })
  serviceIds?: string[];
}
