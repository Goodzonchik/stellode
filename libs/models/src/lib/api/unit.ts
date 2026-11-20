export interface CreateUnitDto {
  name: string;
  description?: string;
}

export interface UpdateUnitDto {
  name?: string;
  description?: string;
}
