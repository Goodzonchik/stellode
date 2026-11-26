import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationEntityType,
  ApplicationVersionStatus,
  type ApplicationListItem,
} from '@stellode/models';

export class ApplicationListItemResponse implements ApplicationListItem {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ enum: [ApplicationEntityType.Application] })
  type!: typeof ApplicationEntityType.Application;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String })
  unitId!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Строка ApplicationVersion.version со статусом current; иначе максимальная по versionNumber среди previous; иначе null',
  })
  currentVersion!: string | null;

  @ApiPropertyOptional({
    enum: Object.values(ApplicationVersionStatus),
    nullable: true,
    description: 'current | previous | null',
  })
  currentVersionStatus!: ApplicationVersionStatus | null;

  @ApiProperty({
    type: Boolean,
    description:
      'true, если у ApplicationVersion(current) есть HAS_COMPONENT.status = deprecated или есть USES от FeatureVersion (draft|active|deprecated) к ComponentVersion(unactive) с applicationId этого приложения',
  })
  hasStatusWarning!: boolean;
}
