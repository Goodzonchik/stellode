import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ImpactAnalysisResult } from '@stellode/models';
import { IdNameResponse } from './id-name-response';
import { ImpactAnomalyResponse } from './impact-anomaly-response';
import { ImpactApplicationDetailResponse } from './impact-application-detail-response';

export class ImpactAnalysisResponse implements ImpactAnalysisResult {
  @ApiProperty({ enum: ['on-prod', 'draft'] })
  mode!: 'on-prod' | 'draft';

  @ApiProperty({ type: [ImpactAnomalyResponse] })
  anomalies!: ImpactAnomalyResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  units!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  teams!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  services!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  features!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  applications!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  components!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  consumers!: IdNameResponse[];

  @ApiProperty({ type: [IdNameResponse] })
  providers!: IdNameResponse[];

  @ApiPropertyOptional({ type: [ImpactApplicationDetailResponse] })
  applicationsDetail?: ImpactApplicationDetailResponse[];
}
