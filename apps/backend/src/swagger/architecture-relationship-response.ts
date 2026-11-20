import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ArchitectureRelationship } from '@stellode/models';

export class ArchitectureRelationshipResponse implements ArchitectureRelationship {
  @ApiProperty({ type: String })
  type!: string;

  @ApiProperty({ type: String })
  from!: string;

  @ApiProperty({ type: String })
  to!: string;

  @ApiProperty({ type: String })
  id!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  properties?: Record<string, unknown>;
}
