import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateFeatureDto } from '@stellode/models';

export class UpdateFeatureRequest implements UpdateFeatureDto {
  @ApiPropertyOptional({ type: String })
  name?: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  serviceIds?: string[];
}
