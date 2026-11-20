import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicationVersionStatus,
  type ApplicationVersionComposition,
} from '@stellode/models';
import { ApplicationVersionCompositionItemResponse } from './application-version-composition-item-response';

export class ApplicationVersionCompositionResponse implements ApplicationVersionComposition {
  @ApiProperty({ type: String })
  applicationVersionId!: string;

  @ApiProperty({ type: String })
  applicationId!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({ enum: [ApplicationVersionStatus.Current, ApplicationVersionStatus.Previous] })
  status!: typeof ApplicationVersionStatus.Current | typeof ApplicationVersionStatus.Previous;

  @ApiProperty({ type: [ApplicationVersionCompositionItemResponse] })
  items!: ApplicationVersionCompositionItemResponse[];
}
