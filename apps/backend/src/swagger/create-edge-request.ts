import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateEdgeDto } from '@stellode/models';
import { DependsOnContextRequest } from './depends-on-context-request';

export class CreateEdgeRequest implements CreateEdgeDto {
  @ApiProperty({ type: String })
  source!: string;

  @ApiProperty({ type: String })
  target!: string;

  @ApiPropertyOptional({ type: DependsOnContextRequest })
  context?: DependsOnContextRequest;
}
