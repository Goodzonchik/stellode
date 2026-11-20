import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateComponentVersionDto } from '@stellode/models';

export class CreateComponentVersionRequest implements CreateComponentVersionDto {
  @ApiProperty({ type: String })
  componentElementId!: string;

  @ApiPropertyOptional({ type: String, description: 'По умолчанию — следующий числовой номер' })
  version?: string;
}
