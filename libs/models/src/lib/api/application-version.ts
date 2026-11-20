import type { ApplicationComponentStatus } from '../derive-component-version-status';
import type { VersionStatus } from '../version-status';
import type { ApplicationVersionStatus } from './entities';

export interface ListApplicationVersionsDto {
  applicationElementId: string;
}

export interface ReleaseComponentsDto {
  applicationVersionId: string;
}

export interface ReleaseComponentSelectionDto {
  componentVersionId: string;
  status: ApplicationComponentStatus;
}

export interface ReleaseApplicationDto {
  applicationId: string;
  sourceApplicationVersionId?: string;
  components: ReleaseComponentSelectionDto[];
  version?: string;
}

export interface RevertApplicationDto {
  applicationId: string;
  sourceApplicationVersionId: string;
}

export interface RenameApplicationVersionDto {
  version: string;
}

export const ReleasePreviewMode = {
  Release: 'release',
  Revert: 'revert',
} as const;

export type ReleasePreviewMode = (typeof ReleasePreviewMode)[keyof typeof ReleasePreviewMode];

export interface ReleasePreviewDto {
  applicationId: string;
  mode: ReleasePreviewMode;
  sourceApplicationVersionId?: string;
  components?: ReleaseComponentSelectionDto[];
}

export interface ReleasePreviewAffectedFeature {
  id: string;
  name: string;
  featureVersionId: string;
  componentVersionId: string;
}

export interface ReleasePreviewDependsOnEdge {
  fromComponentVersionId: string;
  toComponentVersionId: string;
  side: 'consumer' | 'provider';
}

export interface ReleasePreviewLeavingVersion {
  componentVersionId: string;
  version: string;
  componentName: string;
  features: ReleasePreviewAffectedFeature[];
  dependsOnEdges: ReleasePreviewDependsOnEdge[];
  services: Array<{ id: string; name: string }>;
}

export interface ReleasePreviewGlobalStatusChange {
  componentVersionId: string;
  version: string;
  componentName: string;
  fromStatus: VersionStatus;
  toStatus: VersionStatus;
}

export interface ReleasePreviewResponse {
  inThisApplication: ReleasePreviewLeavingVersion[];
  global: ReleasePreviewLeavingVersion[];
  globalStatusChanges: ReleasePreviewGlobalStatusChange[];
}

export interface ComponentVersionApplicationUsage {
  applicationId: string;
  applicationName: string;
  status: ApplicationComponentStatus;
}

export interface ApplicationVersionCompositionItem {
  componentVersionId: string;
  componentId: string;
  componentName: string;
  teamId: string | null;
  teamName: string | null;
  componentVersion: string;
  status: ApplicationComponentStatus;
  /** Глобальный статус CV (для маркера unactive в previous). */
  componentVersionStatus: VersionStatus;
}

export interface ApplicationVersionComposition {
  applicationVersionId: string;
  applicationId: string;
  version: string;
  status: ApplicationVersionStatus;
  items: ApplicationVersionCompositionItem[];
}
