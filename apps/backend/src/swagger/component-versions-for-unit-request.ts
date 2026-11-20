import { ApiProperty } from '@nestjs/swagger';
import type { ComponentVersionsForUnitDto } from '@stellode/models';

export class ComponentVersionsForUnitRequest implements ComponentVersionsForUnitDto {
  @ApiProperty({ type: String })
  unitId!: string;
}
