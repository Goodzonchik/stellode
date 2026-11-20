import type { ComponentVersionApplicationUsage } from './application-version';

export interface ListComponentVersionsDto {
  componentElementId: string;
}

export interface ComponentVersionsForUnitDto {
  unitId: string;
}

export interface CreateComponentVersionDto {
  componentElementId: string;
  version?: string;
}

export type ComponentVersionListItem = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly status: string;
  readonly version: string;
  readonly versionNumber?: number;
  readonly usage?: ComponentVersionApplicationUsage[];
};

export type { ComponentVersionApplicationUsage };
