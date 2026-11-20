import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ReleasePreviewDto } from '@stellode/models';
import { ReleaseComponentSelectionRequest } from './release-component-selection-request';

export class ReleasePreviewRequest implements ReleasePreviewDto {
  @ApiProperty({ type: String })
  applicationId!: string;

  @ApiProperty({ enum: ['release', 'revert'] })
  mode!: 'release' | 'revert';

  @ApiPropertyOptional({ type: String })
  sourceApplicationVersionId?: string;

  @ApiPropertyOptional({ type: [ReleaseComponentSelectionRequest], description: 'Для mode=release: новый состав' })
  components?: ReleaseComponentSelectionRequest[];
}
