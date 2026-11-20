import { ApiProperty } from '@nestjs/swagger';
import type { ReleaseComponentsDto } from '@stellode/models';

export class ReleaseComponentsRequest implements ReleaseComponentsDto {
  @ApiProperty({ type: String })
  applicationVersionId!: string;
}
