import { ApiProperty } from '@nestjs/swagger';
import type { TransitionFeatureVersionBodyDto } from '@stellode/models';

export class TransitionFeatureVersionRequest implements TransitionFeatureVersionBodyDto {
  @ApiProperty({ type: String })
  featureVersionId!: string;

  @ApiProperty({ enum: ['draft', 'active', 'deprecated', 'unactive'] })
  status!: string;
}
