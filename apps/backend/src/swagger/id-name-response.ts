import { ApiProperty } from '@nestjs/swagger';

export class IdNameResponse {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}
