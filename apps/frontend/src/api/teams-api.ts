import type { CreateTeamDto, TeamEntity, UpdateTeamDto } from '@stellode/models';
import { apiClient } from './client';

const list = async (unitId: string): Promise<TeamEntity[]> => {
  const response = await apiClient.post<TeamEntity[]>('/teams', { unitId });
  return response.data;
};

const create = async (payload: CreateTeamDto): Promise<TeamEntity> => {
  const response = await apiClient.post<TeamEntity>('/teams/create', payload);
  return response.data;
};

const update = async (id: string, payload: UpdateTeamDto): Promise<TeamEntity> => {
  const response = await apiClient.put<TeamEntity>(`/teams/${id}`, payload);
  return response.data;
};

const remove = async (id: string): Promise<void> => {
  await apiClient.delete(`/teams/${id}`);
};

export const teamsApi = { list, create, update, remove };
