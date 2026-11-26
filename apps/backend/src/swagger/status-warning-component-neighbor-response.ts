import { ApiProperty } from '@nestjs/swagger';
import {
  VersionStatus,
  type StatusWarningComponentNeighbor,
  type StatusWarningDependsDirection,
} from '@stellode/models';

export class StatusWarningComponentNeighborResponse implements StatusWarningComponentNeighbor {
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  componentId!: string;

  @ApiProperty({ type: String })
  componentName!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({ enum: Object.values(VersionStatus) })
  status!: VersionStatus;

  @ApiProperty({ enum: ['incoming', 'outgoing'] })
  direction!: StatusWarningDependsDirection;
}
