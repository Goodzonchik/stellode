export interface GetComponentsDto {
  unitId?: string;
}

export interface CreateComponentDto {
  unitId: string;
  name: string;
  teamId: string;
  description?: string;
  isDependency: boolean;
  isPublic?: boolean;
}

export type UpdateComponentDto = {
  unitId: string;
  name?: string;
  teamId: string;
  description?: string;
};
