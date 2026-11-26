import { ApiProperty } from '@nestjs/swagger';
import { VersionStatus, type FeatureVersionCheckSnapshot } from '@stellode/models';

export class FeatureVersionCheckSnapshotResponse implements FeatureVersionCheckSnapshot {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: Object.values(VersionStatus) })
  status!: VersionStatus;

  @ApiProperty({ type: Boolean })
  readyToProduction!: boolean;
}
