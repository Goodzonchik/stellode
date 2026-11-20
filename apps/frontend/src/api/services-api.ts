import type {
  AddServiceAggregateDto,
  CreateServiceDto,
  RemoveServiceAggregateDto,
  ServiceEntity,
  UpdateServiceDto,
} from '@stellode/models';
import { apiClient } from './client';

const list = async (unitId: string): Promise<ServiceEntity[]> => {
  const response = await apiClient.post<ServiceEntity[]>('/services', { unitId });
  return response.data;
};

const create = async (payload: CreateServiceDto): Promise<ServiceEntity> => {
  const response = await apiClient.post<ServiceEntity>('/services/create', payload);
  return response.data;
};

const update = async (id: string, payload: UpdateServiceDto): Promise<ServiceEntity> => {
  const response = await apiClient.put<ServiceEntity>(`/services/${id}`, payload);
  return response.data;
};

const archive = async (id: string): Promise<void> => {
  await apiClient.post(`/services/${id}/archive`);
};

const unarchive = async (id: string): Promise<void> => {
  await apiClient.post(`/services/${id}/unarchive`);
};

const addAggregate = async (serviceId: string, payload: AddServiceAggregateDto): Promise<void> => {
  await apiClient.post(`/services/${serviceId}/aggregates`, payload);
};

const removeAggregate = async (
  serviceId: string,
  payload: RemoveServiceAggregateDto,
): Promise<void> => {
  await apiClient.post(`/services/${serviceId}/aggregates/remove`, payload);
};

export const servicesApi = {
  list,
  create,
  update,
  archive,
  unarchive,
  addAggregate,
  removeAggregate,
};
