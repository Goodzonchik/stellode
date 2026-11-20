import type { ArchitectureGraph } from '@stellode/models';
import { apiClient } from './client';

const get = async (path: string): Promise<ArchitectureGraph> => {
  const response = await apiClient.get<ArchitectureGraph>(path);
  return response.data;
};

const featureVersion = async (id: string): Promise<ArchitectureGraph> => {
  const response = await apiClient.get<ArchitectureGraph>(
    `/diagrams/feature-version/${encodeURIComponent(id)}`,
  );
  return response.data;
};

const crossUnit = async (centerUnitId: string): Promise<ArchitectureGraph> => {
  const response = await apiClient.get<ArchitectureGraph>(
    `/diagrams/cross-unit?centerUnitId=${encodeURIComponent(centerUnitId)}`,
  );
  return response.data;
};

const crossUnitBridge = async (unitA: string, unitB: string): Promise<ArchitectureGraph> => {
  const response = await apiClient.get<ArchitectureGraph>(
    `/diagrams/cross-unit/bridge/${encodeURIComponent(unitA)}/${encodeURIComponent(unitB)}`,
  );
  return response.data;
};

export const diagramsApi = { get, featureVersion, crossUnit, crossUnitBridge };
