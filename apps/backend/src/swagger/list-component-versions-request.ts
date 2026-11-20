import { ApiProperty } from '@nestjs/swagger';
import type { ListComponentVersionsDto } from '@stellode/models';

export class ListComponentVersionsRequest implements ListComponentVersionsDto {
  @ApiProperty({ type: String })
  componentElementId!: string;
}
