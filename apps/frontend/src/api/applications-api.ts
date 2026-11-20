import type {
  ApplicationEntity,
  ApplicationListItem,
  CreateApplicationDto,
  UpdateApplicationDto,
} from '@stellode/models';
import { apiClient } from './client';

const list = async (unitId: string): Promise<ApplicationListItem[]> => {
  const response = await apiClient.post<ApplicationListItem[]>('/applications', { unitId });
  return response.data;
};

const create = async (payload: CreateApplicationDto): Promise<ApplicationEntity> => {
  const response = await apiClient.post<ApplicationEntity>('/applications/create', payload);
  return response.data;
};

const update = async (id: string, payload: UpdateApplicationDto): Promise<ApplicationEntity> => {
  const response = await apiClient.put<ApplicationEntity>(`/applications/${id}`, payload);
  return response.data;
};

const remove = async (id: string): Promise<void> => {
  await apiClient.delete(`/applications/${id}`);
};

export const applicationsApi = { list, create, update, remove };
