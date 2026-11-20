import { ApiProperty } from '@nestjs/swagger';
import type { RevertApplicationDto } from '@stellode/models';

export class RevertApplicationRequest implements RevertApplicationDto {
  @ApiProperty({ type: String })
  applicationId!: string;

  @ApiProperty({ type: String })
  sourceApplicationVersionId!: string;
}
