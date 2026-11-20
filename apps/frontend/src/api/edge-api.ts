import type {
  CreateDependsOnFromFeatureVersionsDto,
  CreateEdgeDto,
  CreateEdgeResponseDto,
  DeleteDependsOnFromFeatureVersionsDto,
} from '@stellode/models';
import { apiClient } from './client';

const create = async (payload: CreateEdgeDto): Promise<CreateEdgeResponseDto> => {
  const response = await apiClient.post<CreateEdgeResponseDto>('/edge/create', payload);
  return response.data;
};

const createDependsOnFromFeatureVersions = async (
  payload: CreateDependsOnFromFeatureVersionsDto,
): Promise<void> => {
  await apiClient.post('/edge/depends-on/from-feature-versions', payload);
};

const deleteDependsOn = async (payload: DeleteDependsOnFromFeatureVersionsDto): Promise<void> => {
  await apiClient.post('/edge/depends-on/delete', payload);
};

export const edgeApi = { create, createDependsOnFromFeatureVersions, deleteDependsOn };
