import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateFeatureVersionBodyDto } from '@stellode/models';

export class CreateFeatureVersionRequest implements CreateFeatureVersionBodyDto {
  @ApiProperty({ type: String })
  featureElementId!: string;

  @ApiPropertyOptional({ type: String, description: 'По умолчанию — следующий числовой номер' })
  version?: string;
}
