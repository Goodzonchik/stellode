import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateUnitDto } from '@stellode/models';

export class CreateUnitRequest implements CreateUnitDto {
  @ApiProperty({ type: String })
  name!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
