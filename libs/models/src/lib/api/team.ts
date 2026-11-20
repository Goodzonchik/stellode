export interface FindTeamsDto {
  unitId?: string;
}

export interface CreateTeamDto {
  name: string;
  unitId: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
}

