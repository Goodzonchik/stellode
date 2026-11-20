import type {
  ComponentVersionApplicationUsage,
  ComponentVersionListItem,
  CreateComponentVersionDto,
} from '@stellode/models';
import { apiClient } from './client';

type ComponentVersionListRow = ComponentVersionListItem;

type ComponentVersionsForUnitRow = {
  readonly component: { readonly id: string; readonly name: string; readonly isDependency: boolean };
  readonly versions: ReadonlyArray<{
    readonly id: string;
    readonly version: string;
    readonly versionNumber?: number;
    readonly status: string;
    readonly name?: string;
    readonly usage?: ComponentVersionApplicationUsage[];
  }>;
  readonly team: { readonly id: string; readonly name: string } | null;
};

const list = async (componentElementId: string): Promise<ComponentVersionListRow[]> => {
  const response = await apiClient.post<ComponentVersionListRow[]>('/component-versions', {
    componentElementId,
  });
  return response.data;
};

const create = async (payload: CreateComponentVersionDto): Promise<void> => {
  await apiClient.post('/component-versions/create', payload);
};

const forUnit = async (unitId: string): Promise<ComponentVersionsForUnitRow[]> => {
  const response = await apiClient.post<ComponentVersionsForUnitRow[]>(
    '/component-versions/for-unit',
    { unitId },
  );
  return response.data;
};

export const componentVersionsApi = { list, create, forUnit };
