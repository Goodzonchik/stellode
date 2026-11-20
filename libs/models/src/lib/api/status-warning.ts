import type { VersionStatus } from '../version-status';

export type StatusWarningCandidateStatus = 'deprecated' | 'unactive';

export type StatusWarningCandidate = {
  readonly componentVersionId: string;
  readonly componentId: string;
  readonly componentName: string;
  readonly version: string;
  readonly status: StatusWarningCandidateStatus;
};

export type StatusWarningIdName = {
  readonly id: string;
  readonly name: string;
};

export type StatusWarningDependsDirection = 'incoming' | 'outgoing';

export type StatusWarningComponentNeighbor = {
  readonly componentVersionId: string;
  readonly componentId: string;
  readonly componentName: string;
  readonly version: string;
  readonly status: VersionStatus;
  readonly direction: StatusWarningDependsDirection;
};

export type StatusWarningFeature = {
  readonly id: string;
  readonly name: string;
  readonly versionId: string;
  readonly version: string;
  readonly status: VersionStatus;
};

export type ComponentVersionStatusWarning = {
  readonly componentVersionId: string;
  readonly componentId: string;
  readonly componentName: string;
  readonly version: string;
  readonly status: VersionStatus;
  readonly applications: readonly StatusWarningIdName[];
  readonly teams: readonly StatusWarningIdName[];
  readonly components: readonly StatusWarningComponentNeighbor[];
  readonly features: readonly StatusWarningFeature[];
  readonly services: readonly StatusWarningIdName[];
};
