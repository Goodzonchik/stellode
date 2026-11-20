import type { CreateUnitDto, UnitEntity, UpdateUnitDto } from '@stellode/models';
import { apiClient } from './client';

const list = async (): Promise<UnitEntity[]> => {
  const response = await apiClient.get<UnitEntity[]>('/units');
  return response.data;
};

const create = async (payload: CreateUnitDto): Promise<UnitEntity> => {
  const response = await apiClient.post<UnitEntity>('/units', payload);
  return response.data;
};

const update = async (id: string, payload: UpdateUnitDto): Promise<UnitEntity> => {
  const response = await apiClient.patch<UnitEntity>(`/units/${id}`, payload);
  return response.data;
};

const remove = async (id: string): Promise<void> => {
  await apiClient.delete(`/units/${id}`);
};

export const unitsApi = { list, create, update, remove };
