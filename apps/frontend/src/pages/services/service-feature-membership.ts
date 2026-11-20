export type ServiceRef = {
  id: string;
  name: string;
};

export type FeatureWithServiceRefs = {
  id: string;
  name: string;
  services?: ServiceRef[];
};

export const featuresInService = (
  features: readonly FeatureWithServiceRefs[],
  serviceId: string,
): FeatureWithServiceRefs[] =>
  features.filter((feature) => (feature.services ?? []).some((ref) => ref.id === serviceId));

export const featuresOutsideService = (
  features: readonly FeatureWithServiceRefs[],
  serviceId: string,
): FeatureWithServiceRefs[] =>
  features.filter((feature) => !(feature.services ?? []).some((ref) => ref.id === serviceId));
