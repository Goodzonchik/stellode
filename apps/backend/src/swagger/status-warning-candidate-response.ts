import { ApiProperty } from '@nestjs/swagger';
import type { StatusWarningCandidate, StatusWarningCandidateStatus } from '@stellode/models';

export class StatusWarningCandidateResponse implements StatusWarningCandidate {
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  componentId!: string;

  @ApiProperty({ type: String })
  componentName!: string;

  @ApiProperty({ type: String, description: 'Строка ComponentVersion.version' })
  version!: string;

  @ApiProperty({
    enum: ['deprecated', 'unactive'],
    description: 'Причина попадания в список кандидатов',
  })
  status!: StatusWarningCandidateStatus;
}
