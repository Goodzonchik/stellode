import { ApiProperty } from '@nestjs/swagger';
import type { EdgeWarningDto } from '@stellode/models';

export class EdgeWarningResponse implements EdgeWarningDto {
  @ApiProperty({ enum: ['ACTIVE_TO_DRAFT', 'ACTIVE_TO_DEPRECATED', 'DEPRECATED_TO_DRAFT', 'DEPRECATED_TO_DEPRECATED', 'ACTIVE_TO_UNACTIVE', 'DEPRECATED_TO_UNACTIVE'] })
  code!: 'ACTIVE_TO_DRAFT' | 'ACTIVE_TO_DEPRECATED' | 'DEPRECATED_TO_DRAFT' | 'DEPRECATED_TO_DEPRECATED' | 'ACTIVE_TO_UNACTIVE' | 'DEPRECATED_TO_UNACTIVE';

  @ApiProperty({ type: String })
  message!: string;
}
