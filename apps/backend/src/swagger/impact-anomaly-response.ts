import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ImpactAnomaly } from '@stellode/models';

export class ImpactAnomalyResponse implements ImpactAnomaly {
  @ApiProperty({ enum: ['DEPENDS_ON_UNACTIVE_TARGET', 'DEPENDS_ON_STATUS_WARNING', 'CROSS_UNIT_NON_PUBLIC'] })
  code!: 'DEPENDS_ON_UNACTIVE_TARGET' | 'DEPENDS_ON_STATUS_WARNING' | 'CROSS_UNIT_NON_PUBLIC';

  @ApiProperty({ type: String })
  message!: string;

  @ApiPropertyOptional({ type: String })
  fromComponentVersionId?: string;

  @ApiPropertyOptional({ type: String })
  toComponentVersionId?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'deprecated', 'unactive'] })
  fromStatus?: 'draft' | 'active' | 'deprecated' | 'unactive';

  @ApiPropertyOptional({ enum: ['draft', 'active', 'deprecated', 'unactive'] })
  toStatus?: 'draft' | 'active' | 'deprecated' | 'unactive';
}
