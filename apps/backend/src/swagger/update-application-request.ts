import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateApplicationDto } from '@stellode/models';

export class UpdateApplicationRequest implements UpdateApplicationDto {
  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
