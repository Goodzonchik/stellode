export const FeatureBindingReadinessReason = {
  Ready: 'ready',
  ApplicationHasNoCurrentRelease: 'application_has_no_current_release',
  ComponentNotInCurrentRelease: 'component_not_in_current_release',
  ComponentNotActiveInRelease: 'component_not_active_in_release',
} as const;

export type FeatureBindingReadinessReason =
  (typeof FeatureBindingReadinessReason)[keyof typeof FeatureBindingReadinessReason];
