import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateUnitDto } from '@stellode/models';

export class UpdateUnitRequest implements UpdateUnitDto {
  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
