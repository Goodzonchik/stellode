import { ApiProperty } from '@nestjs/swagger';
import type { ReleaseComponentSelectionDto } from '@stellode/models';

export class ReleaseComponentSelectionRequest implements ReleaseComponentSelectionDto {
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ enum: ['active', 'deprecated'], description: 'Прикладной статус на ребре HAS_COMPONENT' })
  status!: 'active' | 'deprecated';
}
