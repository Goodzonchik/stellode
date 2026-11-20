import { ApiProperty } from '@nestjs/swagger';
import type { ArchitectureGraph } from '@stellode/models';
import { ArchitectureNodeResponse } from './architecture-node-response';
import { ArchitectureRelationshipResponse } from './architecture-relationship-response';

export class ArchitectureGraphResponse implements ArchitectureGraph {
  @ApiProperty({ type: [ArchitectureNodeResponse] })
  nodes!: ArchitectureNodeResponse[];

  @ApiProperty({ type: [ArchitectureRelationshipResponse] })
  relationships!: ArchitectureRelationshipResponse[];
}
