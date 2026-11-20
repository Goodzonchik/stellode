import { Injectable, Inject, OnApplicationShutdown } from '@nestjs/common';
import neo4j, { type Driver, type Record as DriverRecord } from 'neo4j-driver';

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  label: string;
  from: string;
  to: string;
  properties: Record<string, unknown>;
}

export interface GraphQueryRecord {
  get(key: string): unknown;
  keys(): string[];
}

export interface GraphQueryResult {
  records: GraphQueryRecord[];
}

const isDriverNode = (value: object): boolean =>
  'labels' in value && 'properties' in value && 'identity' in value;

const isDriverRelationship = (value: object): boolean =>
  'type' in value && 'start' in value && 'end' in value && 'properties' in value;

const normalizeProperties = (raw: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key] = normalizeValue(value);
  }
  return normalized;
};

const toGraphNode = (value: Record<string, unknown>): GraphNode => {
  const properties = normalizeProperties((value.properties as Record<string, unknown>) ?? {});
  const businessId = properties.id;
  const labels = value.labels as string[];
  return {
    id: typeof businessId === 'string' && businessId.length > 0 ? businessId : String(value.identity ?? ''),
    label: labels[0] ?? '',
    properties,
  };
};

const toGraphEdge = (value: Record<string, unknown>): GraphEdge => {
  const properties = normalizeProperties((value.properties as Record<string, unknown>) ?? {});
  const businessId = properties.id;
  return {
    id: typeof businessId === 'string' && businessId.length > 0 ? businessId : String(value.identity ?? ''),
    label: String(value.type ?? ''),
    from: String(value.start ?? ''),
    to: String(value.end ?? ''),
    properties,
  };
};

const normalizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (isDriverNode(record)) {
      return toGraphNode(record);
    }
    if (isDriverRelationship(record)) {
      return toGraphEdge(record);
    }
    return normalizeProperties(record);
  }
  return value;
};

const toQueryRecord = (record: DriverRecord): GraphQueryRecord => ({
  get: (key: string): unknown => {
    if (record.keys.includes(key)) {
      return normalizeValue(record.get(key));
    }
    if (record.keys.length === 1) {
      return normalizeValue(record.get(record.keys[0]));
    }
    return null;
  },
  keys: (): string[] => record.keys.map((key) => String(key)),
});

const toQueryResult = (records: DriverRecord[]): GraphQueryResult => ({
  records: records.map(toQueryRecord),
});

@Injectable()
export class Neo4jService implements OnApplicationShutdown {
  constructor(
    @Inject('NEO4J_DRIVER')
    private readonly driver: Driver,
  ) {}

  onApplicationShutdown(): Promise<void> {
    return this.driver.close();
  }

  async read(query: string, parameters?: Record<string, unknown>): Promise<GraphQueryResult> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.executeRead((tx) => tx.run(query, parameters ?? {}));
      return toQueryResult(result.records);
    } finally {
      await session.close();
    }
  }

  async write(query: string, parameters?: Record<string, unknown>): Promise<GraphQueryResult> {
    const session = this.driver.session({ defaultAccessMode: neo4j.session.WRITE });
    try {
      const result = await session.executeWrite((tx) => tx.run(query, parameters ?? {}));
      return toQueryResult(result.records);
    } finally {
      await session.close();
    }
  }
}
