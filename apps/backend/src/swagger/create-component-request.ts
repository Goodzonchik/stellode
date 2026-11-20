import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateComponentDto } from '@stellode/models';

export class CreateComponentRequest implements CreateComponentDto {
  @ApiProperty({ type: String })
  unitId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  teamId!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ type: Boolean })
  isDependency!: boolean;

  @ApiPropertyOptional({ type: Boolean })
  isPublic?: boolean;
}
