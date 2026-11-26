import { ApiProperty } from '@nestjs/swagger';
import { VersionStatus, type StatusWarningFeature } from '@stellode/models';

export class StatusWarningFeatureResponse implements StatusWarningFeature {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  versionId!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({ enum: Object.values(VersionStatus) })
  status!: VersionStatus;
}
