import { ApiProperty } from '@nestjs/swagger';
import type { ReleasePreviewResponse } from '@stellode/models';
import { ReleasePreviewGlobalStatusChangeResponse } from './release-preview-global-status-change-response';
import { ReleasePreviewLeavingVersionResponse } from './release-preview-leaving-version-response';

export class ReleasePreviewResponseBody implements ReleasePreviewResponse {
  @ApiProperty({ type: [ReleasePreviewLeavingVersionResponse] })
  inThisApplication!: ReleasePreviewLeavingVersionResponse[];

  @ApiProperty({ type: [ReleasePreviewLeavingVersionResponse] })
  global!: ReleasePreviewLeavingVersionResponse[];

  @ApiProperty({ type: [ReleasePreviewGlobalStatusChangeResponse] })
  globalStatusChanges!: ReleasePreviewGlobalStatusChangeResponse[];
}
