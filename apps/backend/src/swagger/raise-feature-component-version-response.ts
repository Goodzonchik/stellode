import { ApiProperty } from '@nestjs/swagger';
import type { RaiseFeatureComponentVersionResult } from '@stellode/models';

export class RaiseFeatureComponentVersionResponse implements RaiseFeatureComponentVersionResult {
  @ApiProperty({ type: String })
  fromComponentVersionId!: string;

  @ApiProperty({ type: String })
  toComponentVersionId!: string;

  @ApiProperty({ type: String })
  applicationId!: string;

  @ApiProperty({ type: Boolean })
  createdComponentVersion!: boolean;
}
