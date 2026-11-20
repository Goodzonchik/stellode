export const FeatureVersionReadinessReason = {
  NoComponentBindings: 'no_component_bindings',
} as const;

export type FeatureVersionReadinessReason =
  (typeof FeatureVersionReadinessReason)[keyof typeof FeatureVersionReadinessReason];
