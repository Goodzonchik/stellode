import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ImpactApplicationDetail } from '@stellode/models';
import { IdNameResponse } from './id-name-response';

export class ImpactApplicationDetailResponse implements ImpactApplicationDetail {
  @ApiProperty({ type: IdNameResponse })
  application!: IdNameResponse;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'deprecated', 'unactive'], description: 'HAS_COMPONENT.status в current-составе' })
  status?: 'draft' | 'active' | 'deprecated' | 'unactive';

  @ApiProperty({ type: [IdNameResponse] })
  features!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  services!: IdNameResponse[];
}
