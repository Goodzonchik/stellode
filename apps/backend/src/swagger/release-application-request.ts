import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ReleaseApplicationDto } from '@stellode/models';
import { ReleaseComponentSelectionRequest } from './release-component-selection-request';

export class ReleaseApplicationRequest implements ReleaseApplicationDto {
  @ApiProperty({ type: String })
  applicationId!: string;

  @ApiPropertyOptional({ type: String, description: 'Обязателен, кроме первого релиза приложения; указывает на ApplicationVersion со статусом current' })
  sourceApplicationVersionId?: string;

  @ApiProperty({ type: [ReleaseComponentSelectionRequest] })
  components!: ReleaseComponentSelectionRequest[];

  @ApiPropertyOptional({ type: String, description: 'По умолчанию — следующий числовой номер' })
  version?: string;
}
