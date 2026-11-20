export type FeatureVersionCompareSets = {
  readonly composition: ReadonlySet<string>;
  readonly dependsOn: ReadonlySet<string>;
  readonly applications: ReadonlySet<string>;
  readonly units: ReadonlySet<string>;
};

export const compositionCompareKey = (
  componentVersionId: string,
  applicationId: string,
): string => `${componentVersionId}::${applicationId}`;

export const dependsOnCompareKey = (sourceId: string, targetId: string): string =>
  `${sourceId}::${targetId}`;
