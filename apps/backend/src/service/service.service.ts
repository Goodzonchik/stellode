import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mergeCypherSetParts, optionalDescriptionSet } from '../common/set-parts';
import {
  assertNameImmutable,
  assertUnitScopedNameUnique,
  normalizeEntityName,
} from '../common/entity-name';
import { isGraphNode } from '../common/graph-helpers';
import { getGraphNodeProperties } from '../common/graph-node-properties';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';
import type { CreateServiceDto, UpdateServiceDto } from '@stellode/models';

const toServiceDto = (node: GraphNode) => {
  const properties = getGraphNodeProperties(node);
  const description =
    properties.description === null
      ? null
      : properties.description === undefined
        ? undefined
        : String(properties.description);
  const type = properties.type === undefined || properties.type === null ? undefined : String(properties.type);
  const status =
    properties.status === undefined || properties.status === null ? undefined : String(properties.status);
  return {
    id: String(properties.id ?? node.id),
    unitId: String(properties.unitId ?? ''),
    name: String(properties.name ?? ''),
    description,
    type,
    status,
  };
};

const nodeToDtoOrNull = (value: unknown) => (isGraphNode(value) ? toServiceDto(value) : null);

@Injectable()
export class ServiceService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(data: CreateServiceDto) {
    const name = normalizeEntityName(data.name);
    await assertUnitScopedNameUnique({
      neo4jService: this.neo4jService,
      label: 'Service',
      unitId: data.unitId,
      name,
    });
    const id = randomUUID();

    const query = `
      MATCH (unit:Unit {id: $unitId})
      CREATE (service:Service {
        id: $id,
        unitId: $unitId,
        name: $name,
        description: $description,
        type: 'service',
        status: 'active'
      })
      CREATE (unit)-[:PROVIDES]->(service)
      RETURN service
    `;

    const result = await this.neo4jService.write(query, {
      unitId: data.unitId,
      id,
      name,
      description: data.description ? data.description : null,
    });
    return nodeToDtoOrNull(result.records[0]?.get('service'));
  }

  async findAll(data: { unitId: string }) {
    const query = `
      MATCH (:Unit {id: $unitId})-[:PROVIDES]->(service:Service)
      RETURN service
      ORDER BY service.name ASC
    `;
    const result = await this.neo4jService.read(query, { unitId: data.unitId });
    return result.records
      .map((record) => record.get('service'))
      .filter(isGraphNode)
      .map(toServiceDto);
  }

  async findById(id: string) {
    const query = `MATCH (service:Service {id: $id}) RETURN service`;
    const result = await this.neo4jService.read(query, { id });
    return nodeToDtoOrNull(result.records[0]?.get('service'));
  }

  async update(id: string, data: UpdateServiceDto) {
    await this.#assertServiceActive(id);
    assertNameImmutable(data.name, 'Service');
    const parts = [
      optionalDescriptionSet(data.description, 'description'),
    ].filter((part): part is NonNullable<typeof part> => part !== null);

    if (parts.length === 0) {
      return this.findById(id);
    }

    const { setClause, params } = mergeCypherSetParts(parts, 'service');
    const query = `
      MATCH (service:Service {id: $id})
      ${setClause}
      RETURN service
    `;

    const result = await this.neo4jService.write(query, { id, ...params });
    return nodeToDtoOrNull(result.records[0]?.get('service'));
  }

  async archive(id: string) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Service not found');
    }
    const current = typeof existing.status === 'string' ? existing.status : 'active';
    if (current === 'archive') {
      return existing;
    }
    await this.neo4jService.write(
      `MATCH (service:Service {id: $id}) SET service.status = $status`,
      { id, status: 'archive' },
    );
    return this.findById(id);
  }

  async unarchive(id: string) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Service not found');
    }
    const current = typeof existing.status === 'string' ? existing.status : 'active';
    if (current !== 'archive') {
      return existing;
    }
    await this.neo4jService.write(
      `MATCH (service:Service {id: $id}) SET service.status = $status`,
      { id, status: 'active' },
    );
    return this.findById(id);
  }

  async addFeatureAggregate(serviceId: string, featureId: string) {
    await this.#assertServiceActive(serviceId);

    const svc = await this.neo4jService.read(
      `MATCH (service:Service {id: $serviceId}) RETURN service.unitId AS value`,
      { serviceId },
    );
    if (!svc.records[0]) throw new NotFoundException('Service not found');

    const feat = await this.neo4jService.read(
      `MATCH (feature:Feature {id: $featureId}) RETURN feature.unitId AS value`,
      { featureId },
    );
    if (!feat.records[0]) throw new NotFoundException('Feature not found');

    const serviceUnitId = svc.records[0].get('value');
    const featureUnitId = feat.records[0].get('value');
    if (serviceUnitId !== featureUnitId) {
      throw new BadRequestException('Feature and service must belong to the same unit');
    }

    const active = await this.neo4jService.read(
      `
      MATCH (:Service {id: $serviceId})-[aggregatesEdge:AGGREGATES]->(:Feature {id: $featureId})
      WHERE coalesce(aggregatesEdge.deleted, false) = false
      RETURN count(aggregatesEdge) AS value
      `,
      { serviceId, featureId },
    );
    if (Number(active.records[0]?.get('value') ?? 0) > 0) {
      throw new ConflictException('Feature already in active service composition');
    }

    await this.neo4jService.write(
      `
      MATCH (service:Service {id: $serviceId}), (feature:Feature {id: $featureId})
      CREATE (service)-[:AGGREGATES {id: $edgeId, deleted: false}]->(feature)
      `,
      { serviceId, featureId, edgeId: randomUUID() },
    );

    return { serviceId, featureId, ok: true as const };
  }

  async removeFeatureAggregate(
    serviceId: string,
    featureId: string,
    deletedReason?: string,
  ) {
    await this.#assertServiceActive(serviceId);
    const reason = (deletedReason ?? '').trim();

    const res = await this.neo4jService.write(
      `
      MATCH (:Service {id: $serviceId})-[aggregatesEdge:AGGREGATES]->(:Feature {id: $featureId})
      WHERE coalesce(aggregatesEdge.deleted, false) = false
      SET aggregatesEdge.deleted = true
      RETURN aggregatesEdge.id AS value
      `,
      { serviceId, featureId },
    );
    if (!res.records.length) {
      throw new NotFoundException('No active AGGREGATES relationship for this pair');
    }

    const edgeId = res.records[0].get('value');
    if (typeof edgeId === 'string' && reason !== '') {
      await this.neo4jService.write(
        `
        MATCH ()-[aggregatesEdge:AGGREGATES]->()
        WHERE aggregatesEdge.id = $edgeId
        SET aggregatesEdge.deleted_reason = $reason
        `,
        { edgeId, reason },
      );
    }

    return { serviceId, featureId, ok: true as const };
  }

  async #assertServiceActive(serviceId: string): Promise<void> {
    const row = await this.neo4jService.read(
      `MATCH (service:Service {id: $serviceId}) RETURN service.status AS value`,
      { serviceId },
    );
    if (!row.records[0]) {
      throw new NotFoundException('Service not found');
    }
    const status = row.records[0].get('value');
    if (status === 'archive') {
      throw new ConflictException('Service is archived');
    }
  }
}
