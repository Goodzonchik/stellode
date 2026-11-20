import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RemoveServiceAggregateDto } from '@stellode/models';

export class RemoveServiceAggregateRequest implements RemoveServiceAggregateDto {
  @ApiProperty({ type: String, description: 'UUID фичи' })
  featureId!: string;

  @ApiPropertyOptional({ type: String, description: 'Причина снятия (сохраняется как deleted_reason)' })
  deletedReason?: string;
}
