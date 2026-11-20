import type { VersionStatus } from './version-status';
import { parseVersionStatus } from './version-status';

export const GraphProjection = {
  OnProd: 'on-prod',
  Draft: 'draft',
} as const;

export type GraphProjection = (typeof GraphProjection)[keyof typeof GraphProjection];

export const ImpactQueryMode = GraphProjection;
export type ImpactQueryMode = GraphProjection;

export interface ImpactIdName {
  id: string;
  name: string;
}

export const ImpactAnomalyCode = {
  DependsOnUnactiveTarget: 'DEPENDS_ON_UNACTIVE_TARGET',
  DependsOnStatusWarning: 'DEPENDS_ON_STATUS_WARNING',
  CrossUnitNonPublic: 'CROSS_UNIT_NON_PUBLIC',
} as const;

export type ImpactAnomalyCode = (typeof ImpactAnomalyCode)[keyof typeof ImpactAnomalyCode];

export interface ImpactAnomaly {
  code: ImpactAnomalyCode;
  message: string;
  fromComponentVersionId?: string;
  toComponentVersionId?: string;
  fromStatus?: VersionStatus;
  toStatus?: VersionStatus;
}

export interface ImpactApplicationDetail {
  application: ImpactIdName;
  status?: VersionStatus;
  features: ImpactIdName[];
  services: ImpactIdName[];
}

export interface ImpactAnalysisResult {
  mode: GraphProjection;
  anomalies: ImpactAnomaly[];
  units: ImpactIdName[];
  teams: ImpactIdName[];
  services: ImpactIdName[];
  features: ImpactIdName[];
  applications: ImpactIdName[];
  components: ImpactIdName[];
  consumers: ImpactIdName[];
  providers: ImpactIdName[];
  applicationsDetail?: ImpactApplicationDetail[];
}

const graphProjections: readonly GraphProjection[] = [
  GraphProjection.OnProd,
  GraphProjection.Draft,
];

const isGraphProjection = (value: unknown): value is GraphProjection =>
  typeof value === 'string' && (graphProjections as readonly string[]).includes(value);

const allowedAnomalyCodes = new Set<string>(Object.values(ImpactAnomalyCode));

const parseImpactIdName = (item: unknown): ImpactIdName | null => {
  if (typeof item !== 'object' || item === null) return null;
  const record = item as Record<string, unknown>;
  if (typeof record['id'] !== 'string' || typeof record['name'] !== 'string') return null;
  return { id: record['id'], name: record['name'] };
};

const parseImpactIdNameList = (raw: unknown): ImpactIdName[] | null => {
  if (!Array.isArray(raw)) return null;
  const out: ImpactIdName[] = [];
  for (const x of raw) {
    const row = parseImpactIdName(x);
    if (!row) return null;
    out.push(row);
  }
  return out;
};

const parseImpactAnomaly = (item: unknown): ImpactAnomaly | null => {
  if (typeof item !== 'object' || item === null) return null;
  const record = item as Record<string, unknown>;
  if (typeof record['code'] !== 'string' || !allowedAnomalyCodes.has(record['code'])) return null;
  if (typeof record['message'] !== 'string') return null;

  const fromComponentVersionId =
    'fromComponentVersionId' in record && typeof record['fromComponentVersionId'] === 'string'
      ? record['fromComponentVersionId']
      : undefined;

  const toComponentVersionId =
    'toComponentVersionId' in record && typeof record['toComponentVersionId'] === 'string'
      ? record['toComponentVersionId']
      : undefined;

  const fromStatus = parseVersionStatus(record['fromStatus']);
  const toStatus = parseVersionStatus(record['toStatus']);
  if (record['fromStatus'] !== undefined && fromStatus === null) return null;
  if (record['toStatus'] !== undefined && toStatus === null) return null;

  return {
    code: record['code'] as ImpactAnomalyCode,
    message: record['message'],
    ...(fromComponentVersionId !== undefined ? { fromComponentVersionId } : {}),
    ...(toComponentVersionId !== undefined ? { toComponentVersionId } : {}),
    ...(fromStatus !== undefined && fromStatus !== null ? { fromStatus } : {}),
    ...(toStatus !== undefined && toStatus !== null ? { toStatus } : {}),
  };
};

const parseImpactAnomalyList = (raw: unknown): ImpactAnomaly[] | null => {
  if (!Array.isArray(raw)) return null;
  const out: ImpactAnomaly[] = [];
  for (const x of raw) {
    const row = parseImpactAnomaly(x);
    if (!row) return null;
    out.push(row);
  }
  return out;
};

export const parseImpactAnalysisResult = (data: unknown): ImpactAnalysisResult | null => {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const modeRaw = record['mode'];
  if (!isGraphProjection(modeRaw)) return null;

  const anomalies = parseImpactAnomalyList(record['anomalies']);
  const units = parseImpactIdNameList(record['units']);
  const teams = parseImpactIdNameList(record['teams']);
  const services = parseImpactIdNameList(record['services']);
  const features = parseImpactIdNameList(record['features']);
  const applications = parseImpactIdNameList(record['applications']);
  const components = parseImpactIdNameList(record['components']);
  const consumers = parseImpactIdNameList(record['consumers']);
  const providers = parseImpactIdNameList(record['providers']);

  if (
    anomalies === null ||
    units === null ||
    teams === null ||
    services === null ||
    features === null ||
    applications === null ||
    components === null ||
    consumers === null ||
    providers === null
  ) {
    return null;
  }

  const applicationsDetailRaw = record['applicationsDetail'];
  if (applicationsDetailRaw !== undefined) {
    const applicationsDetail = parseApplicationsDetailList(applicationsDetailRaw);
    if (applicationsDetail === null) return null;
    return {
      mode: modeRaw,
      anomalies,
      units,
      teams,
      services,
      features,
      applications,
      components,
      consumers,
      providers,
      applicationsDetail,
    };
  }

  return {
    mode: modeRaw,
    anomalies,
    units,
    teams,
    services,
    features,
    applications,
    components,
    consumers,
    providers,
  };
};

const parseApplicationsDetailList = (raw: unknown): ImpactApplicationDetail[] | null => {
  if (!Array.isArray(raw)) return null;
  const out: ImpactApplicationDetail[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const record = item as Record<string, unknown>;
    const application = parseImpactIdName(record['application']);
    if (!application) return null;
    const features = parseImpactIdNameList(record['features']);
    const services = parseImpactIdNameList(record['services']);
    if (features === null || services === null) return null;
    const status =
      record['status'] === undefined ? undefined : parseVersionStatus(record['status']);
    if (record['status'] !== undefined && status === null) return null;
    out.push({
      application,
      features,
      services,
      ...(status !== undefined && status !== null ? { status } : {}),
    });
  }
  return out;
};
