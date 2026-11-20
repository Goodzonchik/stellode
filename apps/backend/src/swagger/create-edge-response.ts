import { ApiProperty } from '@nestjs/swagger';
import type { CreateEdgeResponseDto } from '@stellode/models';
import { EdgeWarningResponse } from './edge-warning-response';

export class CreateEdgeResponse implements CreateEdgeResponseDto {
  @ApiProperty({ type: String })
  source!: string;

  @ApiProperty({ type: String })
  target!: string;

  @ApiProperty({ type: [EdgeWarningResponse] })
  warnings!: EdgeWarningResponse[];
}
