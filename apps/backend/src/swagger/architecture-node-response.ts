import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Node } from '@stellode/models';

export class ArchitectureNodeResponse implements Node {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: ['Unit', 'Application', 'ApplicationVersion', 'Feature', 'Team', 'Component', 'Service', 'FeatureVersion', 'ComponentVersion'], isArray: true })
  labels!: Array<'Unit' | 'Application' | 'ApplicationVersion' | 'Feature' | 'Team' | 'Component' | 'Service' | 'FeatureVersion' | 'ComponentVersion'>;

  @ApiProperty({ type: String })
  type!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiPropertyOptional({ type: String })
  unitId?: string;

  @ApiPropertyOptional({ type: Boolean })
  isDependency?: boolean;

  @ApiPropertyOptional({ type: String })
  version?: string;

  @ApiPropertyOptional({ type: Number })
  versionNumber?: number;

  @ApiPropertyOptional({ type: String })
  status?: string;

  @ApiPropertyOptional({ type: String })
  actualVersion?: string;

  @ApiPropertyOptional({ type: Number })
  actualVersionNumber?: number;

  @ApiPropertyOptional({ type: String })
  draftVersion?: string;

  @ApiPropertyOptional({ type: Number })
  draftVersionNumber?: number;
}
