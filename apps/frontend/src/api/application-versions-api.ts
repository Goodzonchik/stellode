import type {
  ApplicationVersionComposition,
  ApplicationVersionRow,
  ReleaseApplicationDto,
  ReleaseComponentsDto,
  ReleasePreviewDto,
  ReleasePreviewResponse,
  RenameApplicationVersionDto,
  RevertApplicationDto,
} from '@stellode/models';
import { apiClient } from './client';

const list = async (applicationElementId: string): Promise<ApplicationVersionRow[]> => {
  const response = await apiClient.post<ApplicationVersionRow[]>('/application-versions', {
    applicationElementId,
  });
  return response.data;
};

const rename = async (id: string, payload: RenameApplicationVersionDto): Promise<void> => {
  await apiClient.patch(`/application-versions/${id}`, payload);
};

const composition = async (versionId: string): Promise<ApplicationVersionComposition> => {
  const response = await apiClient.get<ApplicationVersionComposition>(
    `/application-versions/${versionId}/composition`,
  );
  return response.data;
};

const releaseComponents = async <T>(payload: ReleaseComponentsDto): Promise<T> => {
  const response = await apiClient.post<T>('/application-versions/release-components', payload);
  return response.data;
};

const releasePreview = async (payload: ReleasePreviewDto): Promise<ReleasePreviewResponse> => {
  const response = await apiClient.post<ReleasePreviewResponse>(
    '/application-versions/release-preview',
    payload,
  );
  return response.data;
};

const release = async (payload: ReleaseApplicationDto): Promise<void> => {
  await apiClient.post('/application-versions/release', payload);
};

const revert = async (payload: RevertApplicationDto): Promise<void> => {
  await apiClient.post('/application-versions/revert', payload);
};

export const applicationVersionsApi = {
  list,
  rename,
  composition,
  releaseComponents,
  releasePreview,
  release,
  revert,
};
