import type {
  ComponentWithTeam,
  CreateComponentDto,
  UpdateComponentDto,
} from '@stellode/models';
import { apiClient } from './client';

type CreatedComponentResult = {
  readonly id?: string;
  readonly draftComponentVersionId?: string;
};

const list = async (unitId: string): Promise<ComponentWithTeam[]> => {
  const response = await apiClient.post<ComponentWithTeam[]>('/components', { unitId });
  return response.data;
};

const create = async (payload: CreateComponentDto): Promise<CreatedComponentResult> => {
  const response = await apiClient.post<CreatedComponentResult>('/components/create', payload);
  return response.data;
};

const update = async (id: string, payload: UpdateComponentDto): Promise<ComponentWithTeam> => {
  const response = await apiClient.put<ComponentWithTeam>(`/components/${id}`, payload);
  return response.data;
};

const remove = async (id: string): Promise<void> => {
  await apiClient.delete(`/components/${id}`);
};

export const componentsApi = { list, create, update, remove };
