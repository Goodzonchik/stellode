export interface GetFeatureVersionsDto {
  featureElementId: string;
}

export type FeatureVersionServiceRef = {
  readonly id: string;
  readonly name: string;
};

export type FeatureVersionComponentLink = {
  readonly id: string;
  readonly name: string;
  readonly version: string | number;
  readonly status: string;
  readonly componentId: string;
};

export type FeatureVersionListItem = {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly versionNumber?: number;
  readonly status: string;
  readonly description?: string;
  readonly inheritedFromId?: string | null;
  readonly services?: readonly FeatureVersionServiceRef[];
  readonly componentVersions?: readonly FeatureVersionComponentLink[];
  readonly componentCount?: number;
  readonly teamCount?: number;
  readonly readyToProduction?: boolean;
};

export interface CreateFeatureVersionBodyDto {
  featureElementId: string;
  version?: string;
}

export interface PublishFeatureVersionDto {
  featureVersionId: string;
}

export interface TransitionFeatureVersionBodyDto {
  featureVersionId: string;
  status: string;
}

export interface FeatureComponentVersionBinding {
  componentVersionId: string;
  applicationId: string;
}

export interface BindFeatureComponentVersionsDto {
  featureVersionId: string;
  add?: FeatureComponentVersionBinding[];
  remove?: FeatureComponentVersionBinding[];
}

export interface CheckFeatureVersionReadyDto {
  featureVersionId: string;
}

export type RaiseFeatureComponentVersionDto = {
  readonly featureVersionId: string;
  readonly fromComponentVersionId: string;
  readonly applicationId: string;
  readonly toComponentVersionId?: string;
};

export type RaiseFeatureComponentVersionResult = {
  readonly fromComponentVersionId: string;
  readonly toComponentVersionId: string;
  readonly applicationId: string;
  readonly createdComponentVersion: boolean;
};
