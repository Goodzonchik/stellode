import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ComponentWithTeam } from '@stellode/models';
import { IdNameResponse } from './id-name-response';

export class ComponentWithTeamResponse implements ComponentWithTeam {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ enum: ['component'] })
  type!: 'component';

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String })
  unitId!: string;

  @ApiProperty({ type: Boolean })
  isDependency!: boolean;

  @ApiProperty({ type: Boolean })
  isPublic!: boolean;

  @ApiProperty({ type: IdNameResponse, nullable: true })
  team!: IdNameResponse | null;

  @ApiPropertyOptional({ type: String })
  draftComponentVersionId?: string;
}
