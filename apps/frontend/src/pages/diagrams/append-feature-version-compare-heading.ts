import { versionStatusLabelFromRaw } from '../../utils/status-label';

type FeatureVersionHeadingPart = {
  readonly version: string;
  readonly status: string;
};

const formatVersionPart = (part: FeatureVersionHeadingPart): string => {
  const statusLabel = versionStatusLabelFromRaw(part.status);
  return `${part.version} (${statusLabel})`;
};

export const appendFeatureVersionCompareHeading = (
  featureLabel: string,
  selected: FeatureVersionHeadingPart,
  previous: FeatureVersionHeadingPart,
): string => {
  const selectedPart = formatVersionPart(selected);
  const previousPart = formatVersionPart(previous);
  return `${featureLabel} · сравнение ${selectedPart} с ${previousPart}`;
};
