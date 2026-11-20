import type {
  ComponentVersionStatusWarning,
  StatusWarningCandidate,
} from '@stellode/models';
import { apiClient } from './client';

const componentVersionWarning = async (
  componentVersionId: string,
): Promise<ComponentVersionStatusWarning> => {
  const response = await apiClient.get<ComponentVersionStatusWarning>(
    `/component-versions/${componentVersionId}/status-warning`,
  );
  return response.data;
};

const applicationCandidates = async (
  applicationId: string,
): Promise<StatusWarningCandidate[]> => {
  const response = await apiClient.get<StatusWarningCandidate[]>(
    `/applications/${applicationId}/status-warning-candidates`,
  );
  return response.data;
};

export const statusWarningApi = { componentVersionWarning, applicationCandidates };
