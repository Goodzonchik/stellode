export interface FindApplicationsDto {
  unitId?: string;
}

export interface CreateApplicationDto {
  name: string;
  unitId: string;
  description?: string;
}

export interface UpdateApplicationDto {
  name?: string;
  description?: string;
}

