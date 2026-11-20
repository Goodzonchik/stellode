import { ApiProperty } from '@nestjs/swagger';
import type { ReleasePreviewDependsOnEdge } from '@stellode/models';

export class ReleasePreviewDependsOnEdgeResponse implements ReleasePreviewDependsOnEdge {
  @ApiProperty({ type: String })
  fromComponentVersionId!: string;

  @ApiProperty({ type: String })
  toComponentVersionId!: string;

  @ApiProperty({ enum: ['consumer', 'provider'] })
  side!: 'consumer' | 'provider';
}
