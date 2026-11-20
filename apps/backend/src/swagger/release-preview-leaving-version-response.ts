import { ApiProperty } from '@nestjs/swagger';
import type { ReleasePreviewLeavingVersion } from '@stellode/models';
import { IdNameResponse } from './id-name-response';
import { ReleasePreviewAffectedFeatureResponse } from './release-preview-affected-feature-response';
import { ReleasePreviewDependsOnEdgeResponse } from './release-preview-depends-on-edge-response';

export class ReleasePreviewLeavingVersionResponse implements ReleasePreviewLeavingVersion {
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({ type: String })
  componentName!: string;

  @ApiProperty({ type: [ReleasePreviewAffectedFeatureResponse] })
  features!: ReleasePreviewAffectedFeatureResponse[];

  @ApiProperty({ type: [ReleasePreviewDependsOnEdgeResponse] })
  dependsOnEdges!: ReleasePreviewDependsOnEdgeResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  services!: IdNameResponse[];
}
