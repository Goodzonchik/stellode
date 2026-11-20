import { ApiProperty } from '@nestjs/swagger';
import type { ReleasePreviewGlobalStatusChange } from '@stellode/models';

export class ReleasePreviewGlobalStatusChangeResponse implements ReleasePreviewGlobalStatusChange {
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({ type: String })
  componentName!: string;

  @ApiProperty({ enum: ['draft', 'active', 'deprecated', 'unactive'] })
  fromStatus!: 'draft' | 'active' | 'deprecated' | 'unactive';

  @ApiProperty({ enum: ['draft', 'active', 'deprecated', 'unactive'] })
  toStatus!: 'draft' | 'active' | 'deprecated' | 'unactive';
}
