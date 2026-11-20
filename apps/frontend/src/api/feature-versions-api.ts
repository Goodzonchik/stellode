import type {
  BindFeatureComponentVersionsDto,
  CheckFeatureVersionReadyDto,
  CheckFeatureVersionReadyResult,
  CreateFeatureVersionBodyDto,
  FeatureVersionListItem,
  RaiseFeatureComponentVersionDto,
  RaiseFeatureComponentVersionResult,
  TransitionFeatureVersionBodyDto,
} from '@stellode/models';
import { apiClient } from './client';

const list = async <T = FeatureVersionListItem>(featureElementId: string): Promise<T[]> => {
  const response = await apiClient.post<T[]>('/feature-versions', { featureElementId });
  return response.data;
};

const create = async (payload: CreateFeatureVersionBodyDto): Promise<void> => {
  await apiClient.post('/feature-versions/create', payload);
};

const transition = async (payload: TransitionFeatureVersionBodyDto): Promise<void> => {
  await apiClient.post('/feature-versions/transition', payload);
};

const remove = async (id: string): Promise<void> => {
  await apiClient.delete(`/feature-versions/${id}`);
};

const checkReady = async (
  payload: CheckFeatureVersionReadyDto,
): Promise<CheckFeatureVersionReadyResult> => {
  const response = await apiClient.post<CheckFeatureVersionReadyResult>(
    '/feature-versions/check-ready',
    payload,
  );
  return response.data;
};

const bindComponentVersions = async (payload: BindFeatureComponentVersionsDto): Promise<void> => {
  await apiClient.post('/feature-versions/bind-component-versions', payload);
};

const raiseComponentVersion = async (
  payload: RaiseFeatureComponentVersionDto,
): Promise<RaiseFeatureComponentVersionResult> => {
  const response = await apiClient.post<RaiseFeatureComponentVersionResult>(
    '/feature-versions/raise-component-version',
    payload,
  );
  return response.data;
};

export const featureVersionsApi = {
  list,
  create,
  transition,
  remove,
  checkReady,
  bindComponentVersions,
  raiseComponentVersion,
};
