export type FeatureVersionLegendRow = {
  readonly id: string;
  readonly version: string;
  readonly versionNumber?: number;
  readonly status: string;
  readonly inheritedFromId?: string | null;
};
