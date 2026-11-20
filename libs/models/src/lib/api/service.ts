export interface FindServicesDto {
  unitId?: string;
}

export interface CreateServiceDto {
  name: string;
  unitId: string;
  description?: string;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
}

export interface AddServiceAggregateDto {
  featureId: string;
}

export interface RemoveServiceAggregateDto {
  featureId: string;
  deletedReason?: string;
}

