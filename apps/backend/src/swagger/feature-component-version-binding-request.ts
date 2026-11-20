import { ApiProperty } from '@nestjs/swagger';
import type { FeatureComponentVersionBinding } from '@stellode/models';

export class FeatureComponentVersionBindingRequest implements FeatureComponentVersionBinding {
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  applicationId!: string;
}
