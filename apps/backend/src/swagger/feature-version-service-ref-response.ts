import { ApiProperty } from '@nestjs/swagger';
import type { FeatureVersionServiceRef } from '@stellode/models';

export class FeatureVersionServiceRefResponse implements FeatureVersionServiceRef {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}
