import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DependsOnContextDto } from '@stellode/models';

export class DependsOnContextRequest implements DependsOnContextDto {
  @ApiPropertyOptional({ type: String })
  consumerServiceId?: string;

  @ApiPropertyOptional({ type: String })
  providerServiceId?: string;

  @ApiPropertyOptional({ type: String })
  consumerApplicationId?: string;

  @ApiPropertyOptional({ type: String })
  providerApplicationId?: string;

  @ApiPropertyOptional({ type: String })
  consumerFeatureId?: string;

  @ApiPropertyOptional({ type: String })
  consumerFeatureVersionId?: string;

  @ApiPropertyOptional({ type: String })
  providerFeatureId?: string;

  @ApiPropertyOptional({ type: String })
  providerFeatureVersionId?: string;
}
