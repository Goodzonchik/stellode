export interface FindFeaturesDto {
  unitId?: string;
}

export interface CreateFeatureDto {
  name: string;
  unitId: string;
  description?: string;
  serviceIds?: string[];
}

export interface UpdateFeatureDto {
  name?: string;
  description?: string;
  serviceIds?: string[];
}

