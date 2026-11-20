export type DependsOnContextDto = {
  readonly consumerServiceId?: string;
  readonly providerServiceId?: string;
  readonly consumerApplicationId?: string;
  readonly providerApplicationId?: string;
  readonly consumerFeatureId?: string;
  readonly consumerFeatureVersionId?: string;
  readonly providerFeatureId?: string;
  readonly providerFeatureVersionId?: string;
};

export interface CreateEdgeDto {
  readonly source: string;
  readonly target: string;
  readonly context?: DependsOnContextDto;
}

export interface CreateDependsOnFromFeatureVersionsDto {
  readonly sourceComponentVersionId: string;
  readonly targetComponentVersionId: string;
  readonly consumerFeatureVersionId: string;
  readonly providerFeatureVersionId: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
}

export interface DeleteDependsOnFromFeatureVersionsDto {
  readonly sourceComponentVersionId: string;
  readonly targetComponentVersionId: string;
  readonly consumerFeatureVersionId: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
}

export const EdgeWarningCode = {
  ActiveToDraft: 'ACTIVE_TO_DRAFT',
  ActiveToDeprecated: 'ACTIVE_TO_DEPRECATED',
  DeprecatedToDraft: 'DEPRECATED_TO_DRAFT',
  DeprecatedToDeprecated: 'DEPRECATED_TO_DEPRECATED',
  ActiveToUnactive: 'ACTIVE_TO_UNACTIVE',
  DeprecatedToUnactive: 'DEPRECATED_TO_UNACTIVE',
} as const;

export type EdgeWarningCode = (typeof EdgeWarningCode)[keyof typeof EdgeWarningCode];

export interface EdgeWarningDto {
  readonly code: EdgeWarningCode;
  readonly message: string;
}

export interface CreateEdgeResponseDto {
  readonly source: string;
  readonly target: string;
  readonly warnings: ReadonlyArray<EdgeWarningDto>;
}

