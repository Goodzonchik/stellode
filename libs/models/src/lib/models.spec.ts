import {
  allowedTargets,
  allowedTargetsFeatureVersion,
  ApplicationEntityType,
  ApplicationVersionEntityType,
  ApplicationVersionStatus,
  ComponentEntityType,
  deriveComponentVersionStatus,
  FeatureEntityType,
  ImpactAnomalyCode,
  parseImpactAnalysisResult,
  parseVersionStatus,
  ServiceEntityType,
  TeamEntityType,
  UnitEntityType,
  VersionStatus,
  type ApplicationEntity,
  type ApplicationListItem,
  type ApplicationVersionRow,
  type ComponentWithTeam,
  type FeatureWithServices,
  type ServiceEntity,
  type TeamEntity,
  type UnitEntity,
} from './index';

type ExpectEqual<Actual, Expected> = (<T>() => T extends Actual ? 1 : 2) extends <
  T,
>() => T extends Expected ? 1 : 2
  ? true
  : false;

type AssertTrue<T extends true> = T;

describe('parseVersionStatus', () => {
  it('returns null for non-string', () => {
    expect(parseVersionStatus(null)).toBeNull();
  });

  it('parses draft', () => {
    expect(parseVersionStatus('draft')).toBe(VersionStatus.Draft);
  });

  it('returns null for unknown', () => {
    expect(parseVersionStatus('unknown')).toBeNull();
  });
});

describe('allowedTargets', () => {
  it('is empty: ComponentVersion status is derived from HAS_COMPONENT', () => {
    expect(allowedTargets(VersionStatus.Draft)).toEqual([]);
    expect(allowedTargets(VersionStatus.Active)).toEqual([]);
  });
});

describe('deriveComponentVersionStatus', () => {
  it('keeps draft regardless of application edges', () => {
    expect(
      deriveComponentVersionStatus(VersionStatus.Draft, [VersionStatus.Active]),
    ).toBe(VersionStatus.Draft);
  });

  it('returns active when any current edge is active', () => {
    expect(
      deriveComponentVersionStatus(VersionStatus.Deprecated, [
        VersionStatus.Deprecated,
        VersionStatus.Active,
      ]),
    ).toBe(VersionStatus.Active);
  });

  it('returns deprecated when only deprecated edges remain', () => {
    expect(
      deriveComponentVersionStatus(VersionStatus.Active, [VersionStatus.Deprecated]),
    ).toBe(VersionStatus.Deprecated);
  });

  it('returns unactive when no current application edges', () => {
    expect(deriveComponentVersionStatus(VersionStatus.Active, [])).toBe(VersionStatus.Unactive);
  });
});

describe('allowedTargetsFeatureVersion', () => {
  it('never allows deprecated transitions', () => {
    expect(allowedTargetsFeatureVersion(VersionStatus.Draft)).toEqual([VersionStatus.Active]);
    expect(allowedTargetsFeatureVersion(VersionStatus.Active)).toEqual([
      VersionStatus.Draft,
      VersionStatus.Unactive,
    ]);
    expect(allowedTargetsFeatureVersion(VersionStatus.Unactive)).toEqual([VersionStatus.Active]);
    expect(allowedTargetsFeatureVersion(VersionStatus.Deprecated)).toEqual([]);
  });
});

const emptyImpactBody = {
  mode: 'on-prod' as const,
  anomalies: [] as const,
  units: [] as const,
  teams: [] as const,
  services: [] as const,
  features: [] as const,
  applications: [] as const,
  components: [] as const,
  consumers: [] as const,
  providers: [] as const,
};

describe('parseImpactAnalysisResult', () => {
  it('returns null for null root', () => {
    expect(parseImpactAnalysisResult(null)).toBeNull();
  });

  it('returns null for non-object root', () => {
    expect(parseImpactAnalysisResult('x')).toBeNull();
  });

  it('returns null for invalid mode', () => {
    expect(parseImpactAnalysisResult({ ...emptyImpactBody, mode: 'other' })).toBeNull();
  });

  it('returns null when a bucket is not an array', () => {
    expect(parseImpactAnalysisResult({ ...emptyImpactBody, units: {} })).toBeNull();
  });

  it('returns null when a bucket item is not id/name object', () => {
    expect(
      parseImpactAnalysisResult({ ...emptyImpactBody, units: [{ id: 'a', name: 1 }] }),
    ).toBeNull();
  });

  it('returns null when anomaly item is invalid', () => {
    expect(
      parseImpactAnalysisResult({
        ...emptyImpactBody,
        anomalies: [{ code: 'UNKNOWN', message: 'm' }],
      }),
    ).toBeNull();
  });

  it('parses minimal empty body', () => {
    expect(parseImpactAnalysisResult(emptyImpactBody)).toEqual(emptyImpactBody);
  });

  it('ignores extra keys such as componentId', () => {
    const parsed = parseImpactAnalysisResult({ componentId: 'c1', ...emptyImpactBody });
    expect(parsed).toEqual(emptyImpactBody);
  });

  it('parses id buckets and anomalies', () => {
    const body = {
      ...emptyImpactBody,
      units: [{ id: 't1', name: 'Unit' }],
      teams: [{ id: 'm1', name: 'Team' }],
      anomalies: [
        {
          code: ImpactAnomalyCode.DependsOnUnactiveTarget,
          message: 'msg',
          fromComponentVersionId: 'a',
          toComponentVersionId: 'b',
          fromStatus: 'active',
          toStatus: 'unactive',
        },
      ],
    };
    expect(parseImpactAnalysisResult(body)).toEqual(body);
  });
});

describe('api node entity types', () => {
  it('exposes backend literal type values', () => {
    expect(ApplicationEntityType.Application).toBe('app');
    expect(TeamEntityType.Team).toBe('team');
    expect(ServiceEntityType.Service).toBe('service');
    expect(FeatureEntityType.Feature).toBe('feature');
    expect(ComponentEntityType.Component).toBe('component');
    expect(ApplicationVersionEntityType.ApplicationVersion).toBe('applicationVersion');
    expect(UnitEntityType.Unit).toBe('unit');
  });

  it('keeps literal type fields on entity models', () => {
    type _ApplicationType = AssertTrue<ExpectEqual<ApplicationEntity['type'], 'app'>>;
    type _ApplicationListItemType = AssertTrue<
      ExpectEqual<ApplicationListItem['type'], 'app'>
    >;
    type _TeamType = AssertTrue<ExpectEqual<TeamEntity['type'], 'team'>>;
    type _ServiceType = AssertTrue<ExpectEqual<ServiceEntity['type'], 'service'>>;
    type _FeatureType = AssertTrue<ExpectEqual<FeatureWithServices['type'], 'feature'>>;
    type _ComponentType = AssertTrue<ExpectEqual<ComponentWithTeam['type'], 'component'>>;
    type _ApplicationVersionType = AssertTrue<
      ExpectEqual<ApplicationVersionRow['type'], 'applicationVersion'>
    >;
    type _UnitType = AssertTrue<ExpectEqual<UnitEntity['type'], 'unit'>>;

    const application: ApplicationEntity = {
      id: 'a1',
      unitId: 't1',
      name: 'App',
      description: null,
      type: ApplicationEntityType.Application,
    };
    const applicationListItem: ApplicationListItem = {
      ...application,
      currentVersion: '2',
      currentVersionStatus: ApplicationVersionStatus.Current,
      hasStatusWarning: false,
    };
    const team: TeamEntity = {
      id: 'tm1',
      unitId: 't1',
      name: 'Team',
      description: null,
      type: TeamEntityType.Team,
    };
    const service: ServiceEntity = {
      id: 's1',
      unitId: 't1',
      name: 'Service',
      description: null,
      type: ServiceEntityType.Service,
      status: 'active',
    };
    const feature: FeatureWithServices = {
      id: 'f1',
      unitId: 't1',
      name: 'Feature',
      description: null,
      type: FeatureEntityType.Feature,
      services: [{ id: 's1', name: 'Service' }],
    };
    const component: ComponentWithTeam = {
      id: 'c1',
      unitId: 't1',
      name: 'Component',
      description: null,
      type: ComponentEntityType.Component,
      isDependency: false,
      isPublic: true,
      team: { id: 'tm1', name: 'Team' },
    };
    const applicationVersion: ApplicationVersionRow = {
      id: 'av1',
      name: 'Release',
      type: ApplicationVersionEntityType.ApplicationVersion,
      status: ApplicationVersionStatus.Current,
      version: '1.0',
    };
    const unit: UnitEntity = {
      id: 't1',
      name: 'Unit',
      type: UnitEntityType.Unit,
    };

    expect(application.type).toBe('app');
    expect(applicationListItem.currentVersion).toBe('2');
    expect(applicationListItem.currentVersionStatus).toBe(ApplicationVersionStatus.Current);
    expect(team.type).toBe('team');
    expect(service.type).toBe('service');
    expect(feature.type).toBe('feature');
    expect(component.type).toBe('component');
    expect(applicationVersion.type).toBe('applicationVersion');
    expect(unit.type).toBe('unit');
  });
});
