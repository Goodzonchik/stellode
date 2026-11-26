import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationVersionEntityType,
  ApplicationVersionStatus,
  type ApplicationVersionRow,
} from '@stellode/models';

export class ApplicationVersionRowResponse implements ApplicationVersionRow {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ enum: [ApplicationVersionEntityType.ApplicationVersion] })
  type!: typeof ApplicationVersionEntityType.ApplicationVersion;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ enum: Object.values(ApplicationVersionStatus) })
  status!: ApplicationVersionStatus;

  @ApiProperty({ type: String })
  version!: string;

  @ApiPropertyOptional({ type: Number })
  versionNumber?: number;
}
