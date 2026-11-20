import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BindFeatureComponentVersionsDto } from '@stellode/models';
import { FeatureComponentVersionBindingRequest } from './feature-component-version-binding-request';

export class BindFeatureComponentVersionsRequest implements BindFeatureComponentVersionsDto {
  @ApiProperty({ type: String })
  featureVersionId!: string;

  @ApiPropertyOptional({ type: [FeatureComponentVersionBindingRequest] })
  add?: FeatureComponentVersionBindingRequest[];

  @ApiPropertyOptional({ type: [FeatureComponentVersionBindingRequest] })
  remove?: FeatureComponentVersionBindingRequest[];
}
