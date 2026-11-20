export type ApiNodeBase<TType extends string> = {
  id: string;
  name: string;
  type: TType;
};

export type ApiNode<TType extends string> = ApiNodeBase<TType> & {
  description: string | null;
};

export type UnitScopedApiNode<TType extends string> = ApiNode<TType> & {
  unitId: string;
};

export const ApplicationEntityType = {
  Application: 'app',
} as const;

export type ApplicationEntityType =
  (typeof ApplicationEntityType)[keyof typeof ApplicationEntityType];

export type ApplicationEntity = UnitScopedApiNode<ApplicationEntityType>;

export const TeamEntityType = {
  Team: 'team',
} as const;

export type TeamEntityType = (typeof TeamEntityType)[keyof typeof TeamEntityType];

export type TeamEntity = UnitScopedApiNode<TeamEntityType>;

export const ServiceEntityType = {
  Service: 'service',
} as const;

export type ServiceEntityType = (typeof ServiceEntityType)[keyof typeof ServiceEntityType];

export type ServiceEntity = UnitScopedApiNode<ServiceEntityType> & {
  status?: string;
};

export const FeatureEntityType = {
  Feature: 'feature',
} as const;

export type FeatureEntityType = (typeof FeatureEntityType)[keyof typeof FeatureEntityType];

export type FeatureWithServices = UnitScopedApiNode<FeatureEntityType> & {
  services: Array<{ id: string; name: string }>;
};

export const ComponentEntityType = {
  Component: 'component',
} as const;

export type ComponentEntityType =
  (typeof ComponentEntityType)[keyof typeof ComponentEntityType];

export type ComponentWithTeam = UnitScopedApiNode<ComponentEntityType> & {
  isDependency: boolean;
  isPublic: boolean;
  team: { id: string; name: string } | null;
  draftComponentVersionId?: string;
};

export const ApplicationVersionEntityType = {
  ApplicationVersion: 'applicationVersion',
} as const;

export type ApplicationVersionEntityType =
  (typeof ApplicationVersionEntityType)[keyof typeof ApplicationVersionEntityType];

export const ApplicationVersionStatus = {
  Current: 'current',
  Previous: 'previous',
} as const;

export type ApplicationVersionStatus =
  (typeof ApplicationVersionStatus)[keyof typeof ApplicationVersionStatus];

export type ApplicationListItem = ApplicationEntity & {
  currentVersion: string | null;
  currentVersionStatus: ApplicationVersionStatus | null;
  hasStatusWarning: boolean;
};

export type ApplicationVersionRow = ApiNodeBase<ApplicationVersionEntityType> & {
  description?: string;
  status: ApplicationVersionStatus;
  version: string;
  versionNumber?: number;
};
