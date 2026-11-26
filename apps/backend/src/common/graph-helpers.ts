import { parseVersionStatus, VersionStatus, type VersionStatus as VersionStatusType } from '@stellode/models';
import type { GraphNode } from '../neo4j/neo4j.service';

type IdName = {
  id: string;
  name: string;
};

const isIdName = (v: unknown): v is IdName =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as IdName).id === 'string' &&
  (v as IdName).id.length > 0;

export const filterIdNames = (xs: unknown): IdName[] =>
  Array.isArray(xs) ? xs.filter(isIdName) : [];

export const idNamesFromProjectRecords = (
  records: ReadonlyArray<{ get(key: string): unknown }>,
): IdName[] => {
  const result: IdName[] = [];
  for (const record of records) {
    const id = record.get('id');
    const name = record.get('name');
    if (typeof id === 'string' && id.length > 0) {
      result.push({ id, name: typeof name === 'string' ? name : String(name ?? '') });
    }
  }
  return result;
};

export const isGraphNode = (v: unknown): v is GraphNode =>
  typeof v === 'object' &&
  v !== null &&
  'properties' in v &&
  typeof (v as GraphNode).properties === 'object' &&
  (v as GraphNode).properties !== null &&
  'id' in v &&
  typeof (v as GraphNode).id === 'string';

export const requireGraphNode = (value: unknown): GraphNode => {
  if (!isGraphNode(value)) {
    throw new Error('Expected graph node with id and properties');
  }
  return value;
};

export type SerializedComponentVersion = Record<string, unknown> & {
  id: string;
  status: VersionStatusType;
};

export const serializeCv = (node: GraphNode): SerializedComponentVersion => {
  const properties = node.properties;
  const status = parseVersionStatus(properties.status ?? properties.state) ?? VersionStatus.Unactive;
  return { id: (properties.id as string) ?? node.id, ...properties, status };
};

export interface ComponentVersionView {
  id: string;
  name: unknown;
  version: unknown;
  status: VersionStatusType;
  componentId: unknown;
  isPublic: boolean;
  applicationId?: string;
  applicationName?: string;
}

export const toComponentVersionView = (cv: GraphNode): ComponentVersionView | null => {
  const p = cv.properties;
  const id = p.id as string | undefined;
  if (!id) return null;
  const status = parseVersionStatus(p.status ?? p.state) ?? VersionStatus.Unactive;
  const pubRaw = p.isPublic;
  const isPublicBoolean = pubRaw === true || pubRaw === 'true';
  const applicationIdRaw = p.applicationId;
  const applicationId =
    typeof applicationIdRaw === 'string' && applicationIdRaw.trim().length > 0
      ? applicationIdRaw.trim()
      : undefined;
  const applicationNameRaw = p.applicationName;
  const applicationName =
    typeof applicationNameRaw === 'string' && applicationNameRaw.trim().length > 0
      ? applicationNameRaw.trim()
      : undefined;
  return {
    id,
    name: p.name,
    version: p.version,
    status,
    componentId: p.componentId,
    isPublic: isPublicBoolean,
    ...(applicationId !== undefined ? { applicationId } : {}),
    ...(applicationName !== undefined ? { applicationName } : {}),
  };
};

export interface NewerVersionRow {
  id: string;
  version: string;
  versionNumber: number;
  status: VersionStatusType;
}

export const isNewerVersionRow = (x: unknown): x is Record<string, unknown> => {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) return false;
  if (
    o.versionNumber !== undefined &&
    o.versionNumber !== null &&
    typeof o.versionNumber !== 'number'
  ) {
    return false;
  }
  return true;
};

export const toNewerVersionRow = (x: Record<string, unknown>): NewerVersionRow => ({
  id: String(x.id),
  version: String(x.version ?? ''),
  versionNumber: Number(x.versionNumber ?? 0),
  status: parseVersionStatus(x.status) ?? VersionStatus.Unactive,
});

export interface ComponentSummary {
  id: string;
  name: string;
}

export interface ComponentVersionSummary {
  id: string;
  version: string;
  versionNumber: number;
  status: VersionStatusType;
  componentId: string;
}

export const toComponentSummary = (c: Record<string, unknown>): ComponentSummary => ({
  id: String(c.id),
  name: String(c.name ?? ''),
});

export const toComponentVersionSummary = (cv: Record<string, unknown>): ComponentVersionSummary => {
  const st =
    typeof cv.status === 'string'
      ? parseVersionStatus(cv.status)
      : (cv.status as VersionStatusType | undefined);
  return {
    id: String(cv.id),
    version: String(cv.version ?? ''),
    versionNumber: Number(cv.versionNumber ?? 0),
    status: st ?? VersionStatus.Unactive,
    componentId: String(cv.componentId ?? ''),
  };
};
