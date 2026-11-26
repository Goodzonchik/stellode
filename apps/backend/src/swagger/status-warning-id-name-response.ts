import { ApiProperty } from '@nestjs/swagger';
import type { StatusWarningIdName } from '@stellode/models';

export class StatusWarningIdNameResponse implements StatusWarningIdName {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}
