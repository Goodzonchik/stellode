import { ApiProperty } from '@nestjs/swagger';
import type { ListApplicationVersionsDto } from '@stellode/models';

export class ListApplicationVersionsRequest implements ListApplicationVersionsDto {
  @ApiProperty({ type: String })
  applicationElementId!: string;
}
