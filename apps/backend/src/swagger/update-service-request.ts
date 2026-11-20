import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateServiceDto } from '@stellode/models';

export class UpdateServiceRequest implements UpdateServiceDto {
  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;
}
