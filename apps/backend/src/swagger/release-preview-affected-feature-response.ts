import { ApiProperty } from '@nestjs/swagger';
import type { ReleasePreviewAffectedFeature } from '@stellode/models';

export class ReleasePreviewAffectedFeatureResponse implements ReleasePreviewAffectedFeature {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  featureVersionId!: string;

  @ApiProperty({ type: String })
  componentVersionId!: string;
}
