import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateTeamDto } from '@stellode/models';

export class CreateTeamRequest implements CreateTeamDto {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, description: 'UUID юнита' })
  unitId!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
