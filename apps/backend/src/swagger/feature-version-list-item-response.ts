import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FeatureVersionListItem } from '@stellode/models';
import { FeatureVersionComponentLinkResponse } from './feature-version-component-link-response';
import { FeatureVersionServiceRefResponse } from './feature-version-service-ref-response';

export class FeatureVersionListItemResponse implements FeatureVersionListItem {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiPropertyOptional({ type: Number })
  versionNumber?: number;

  @ApiProperty({ type: String })
  status!: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'uuid непосредственного предшественника по INHERITED, либо null если предшественника нет',
  })
  inheritedFromId?: string | null;

  @ApiPropertyOptional({ type: [FeatureVersionServiceRefResponse] })
  services?: FeatureVersionServiceRefResponse[];

  @ApiPropertyOptional({ type: [FeatureVersionComponentLinkResponse] })
  componentVersions?: FeatureVersionComponentLinkResponse[];

  @ApiPropertyOptional({
    type: Number,
    description: 'Число различных ComponentVersion по исходящим USES_COMPONENT_VERSION',
  })
  componentCount?: number;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Число различных Team с MAINTAINS на родительский Component этих версий (включая dependency и другой юнит)',
  })
  teamCount?: number;

  @ApiPropertyOptional({ type: Boolean })
  readyToProduction?: boolean;
}
