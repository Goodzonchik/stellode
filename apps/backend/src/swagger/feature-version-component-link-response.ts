import { ApiProperty } from '@nestjs/swagger';
import type { FeatureVersionComponentLink } from '@stellode/models';

export class FeatureVersionComponentLinkResponse implements FeatureVersionComponentLink {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'number' }] })
  version!: string | number;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: String })
  componentId!: string;
}
