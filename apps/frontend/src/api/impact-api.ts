import type { ImpactAnalysisResult, ImpactQueryMode } from '@stellode/models';
import { apiClient } from './client';

const byFeature = async (
  featureId: string,
  mode: ImpactQueryMode,
): Promise<ImpactAnalysisResult> => {
  const response = await apiClient.get<ImpactAnalysisResult>(
    `/impact/feature/${encodeURIComponent(featureId)}`,
    { params: { mode } },
  );
  return response.data;
};

const bySegment = async (
  segment: string,
  resourceId: string,
  mode: ImpactQueryMode,
): Promise<ImpactAnalysisResult> => {
  const response = await apiClient.get<ImpactAnalysisResult>(
    `/impact/${segment}/${encodeURIComponent(resourceId)}`,
    { params: { mode } },
  );
  return response.data;
};

export const impactApi = { byFeature, bySegment };
