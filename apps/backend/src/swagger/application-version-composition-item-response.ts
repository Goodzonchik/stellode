import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApplicationVersionCompositionItem } from '@stellode/models';
import { VersionStatus } from '@stellode/models';

export class ApplicationVersionCompositionItemResponse
  implements ApplicationVersionCompositionItem
{
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  componentId!: string;

  @ApiProperty({ type: String })
  componentName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  teamId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  teamName!: string | null;

  @ApiProperty({ type: String })
  componentVersion!: string;

  @ApiProperty({ enum: [VersionStatus.Active, VersionStatus.Deprecated] })
  status!: typeof VersionStatus.Active | typeof VersionStatus.Deprecated;

  @ApiProperty({ enum: Object.values(VersionStatus) })
  componentVersionStatus!: VersionStatus;
}
