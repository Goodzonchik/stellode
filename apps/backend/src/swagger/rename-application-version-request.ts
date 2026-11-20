import { ApiProperty } from '@nestjs/swagger';
import type { RenameApplicationVersionDto } from '@stellode/models';

export class RenameApplicationVersionRequest implements RenameApplicationVersionDto {
  @ApiProperty({ type: String, description: 'Новая строка version (после trim, уникальна в пределах Application)' })
  version!: string;
}
