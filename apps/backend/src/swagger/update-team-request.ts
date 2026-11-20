import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateTeamDto } from '@stellode/models';

export class UpdateTeamRequest implements UpdateTeamDto {
  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
