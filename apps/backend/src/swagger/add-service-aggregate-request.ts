import { ApiProperty } from '@nestjs/swagger';
import type { AddServiceAggregateDto } from '@stellode/models';

export class AddServiceAggregateRequest implements AddServiceAggregateDto {
  @ApiProperty({ type: String, description: 'UUID фичи' })
  featureId!: string;
}
