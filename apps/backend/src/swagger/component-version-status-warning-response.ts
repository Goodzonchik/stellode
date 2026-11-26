import { ApiProperty } from '@nestjs/swagger';
import { VersionStatus, type ComponentVersionStatusWarning } from '@stellode/models';
import { StatusWarningComponentNeighborResponse } from './status-warning-component-neighbor-response';
import { StatusWarningFeatureResponse } from './status-warning-feature-response';
import { StatusWarningIdNameResponse } from './status-warning-id-name-response';

export class ComponentVersionStatusWarningResponse implements ComponentVersionStatusWarning {
  @ApiProperty({ type: String })
  componentVersionId!: string;

  @ApiProperty({ type: String })
  componentId!: string;

  @ApiProperty({ type: String })
  componentName!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({
    enum: Object.values(VersionStatus),
    description: 'Глобальный статус ComponentVersion',
  })
  status!: VersionStatus;

  @ApiProperty({
    type: [StatusWarningIdNameResponse],
    description:
      'Без дублей: контекст DEPENDS_ON ∪ HAS_COMPONENT у current ∪ USES.applicationId от FeatureVersion draft|active|deprecated',
  })
  applications!: StatusWarningIdNameResponse[];

  @ApiProperty({
    type: [StatusWarningIdNameResponse],
    description: 'MAINTAINS выбранной CV ∪ владельцы концов учтённых DEPENDS_ON',
  })
  teams!: StatusWarningIdNameResponse[];

  @ApiProperty({
    type: [StatusWarningComponentNeighborResponse],
    description:
      'Соседние продовые CV по DEPENDS_ON (оба направления); cross-unit только при isPublic поставщика',
  })
  components!: StatusWarningComponentNeighborResponse[];

  @ApiProperty({
    type: [StatusWarningFeatureResponse],
    description: 'FeatureVersion с USES на выбранную CV (draft|active|deprecated)',
  })
  features!: StatusWarningFeatureResponse[];

  @ApiProperty({
    type: [StatusWarningIdNameResponse],
    description: 'Активные AGGREGATES к фичам из features',
  })
  services!: StatusWarningIdNameResponse[];
}
