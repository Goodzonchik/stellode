import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateComponentDto } from '@stellode/models';

export class UpdateComponentRequest implements UpdateComponentDto {
  @ApiProperty({ type: String })
  unitId!: string;

  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiProperty({ type: String })
  teamId!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
