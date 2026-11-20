import type {
  CreateFeatureDto,
  FeatureWithServices,
  UpdateFeatureDto,
} from '@stellode/models';
import { apiClient } from './client';

const list = async <T = FeatureWithServices>(unitId: string): Promise<T[]> => {
  const response = await apiClient.post<T[]>('/features', { unitId });
  return response.data;
};

const create = async (payload: CreateFeatureDto): Promise<FeatureWithServices> => {
  const response = await apiClient.post<FeatureWithServices>('/features/create', payload);
  return response.data;
};

const update = async (id: string, payload: UpdateFeatureDto): Promise<FeatureWithServices> => {
  const response = await apiClient.put<FeatureWithServices>(`/features/${id}`, payload);
  return response.data;
};

const remove = async (id: string): Promise<void> => {
  await apiClient.delete(`/features/${id}`);
};

export const featuresApi = { list, create, update, remove };
