import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  FeatureEntityType,
  type CreateFeatureDto,
  type FeatureWithServices,
  type UpdateFeatureDto,
} from '@stellode/models';
import { mergeCypherSetParts, optionalDescriptionSet } from '../common/set-parts';
import {
  assertNameUnchangedThenUnique,
  assertUnitScopedNameUnique,
  normalizeEntityName,
} from '../common/entity-name';
import { filterIdNames, idNamesFromProjectRecords, isGraphNode } from '../common/graph-helpers';
import { getGraphNodeProperties } from '../common/graph-node-properties';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';

const mapNodeToFeature = (node: GraphNode): FeatureWithServices => {
  const properties = getGraphNodeProperties(node);
  return {
    id: String(properties.id ?? node.id),
    unitId: String(properties.unitId ?? ''),
    name: String(properties.name ?? ''),
    description:
      properties.description === null || properties.description === undefined
        ? null
        : String(properties.description),
    type: FeatureEntityType.Feature,
    services: [],
  };
};

const activeServicesForFeatureQuery = `
  MATCH (service:Service)-[aggregatesEdge:AGGREGATES]->(:Feature {id: $featureId})
  WHERE coalesce(aggregatesEdge.deleted, false) = false
  RETURN DISTINCT service.id AS id, service.name AS name
`;

@Injectable()
export class FeatureService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(data: CreateFeatureDto) {
    const name = normalizeEntityName(data.name);
    await assertUnitScopedNameUnique({
      neo4jService: this.neo4jService,
      label: 'Feature',
      unitId: data.unitId,
      name,
    });
    const id = randomUUID();
    const versionId = randomUUID();

    const query = `
      MATCH (unit:Unit {id: $unitId})
      CREATE (feature:Feature {
        id: $id,
        unitId: $unitId,
        name: $name,
        description: $description,
        type: 'feature'
      })
      CREATE (unit)-[:STAKEHOLDER]->(feature)
      CREATE (featureVersion:FeatureVersion {
        id: $versionId,
        featureId: $id,
        versionNumber: 0,
        version: '0',
        status: 'draft',
        compatibility: 'compatible',
        name: $name,
        type: 'featureVersion'
      })
      CREATE (feature)-[:HAS_DRAFT]->(featureVersion)
      RETURN feature
    `;

    const result = await this.neo4jService.write(query, {
      unitId: data.unitId,
      id,
      versionId,
      name,
      description: data.description ? data.description : null,
    });
    const node = result.records[0]?.get('feature');
    const feature = isGraphNode(node) ? mapNodeToFeature(node) : null;

    if (feature && data.serviceIds && data.serviceIds.length > 0) {
      for (const serviceId of data.serviceIds) {
        await this.neo4jService.write(
          `
          MATCH (service:Service {id: $serviceId}), (feature:Feature {id: $featureId})
          CREATE (service)-[:AGGREGATES {id: $edgeId, deleted: false}]->(feature)
          `,
          { serviceId, featureId: feature.id, edgeId: randomUUID() },
        );
      }
    }

    return feature;
  }

  async findAll(data: { unitId: string }) {
    const query = `
      MATCH (:Unit {id: $unitId})-[:STAKEHOLDER]->(feature:Feature)
      OPTIONAL MATCH (service:Service)-[aggregatesEdge:AGGREGATES]->(feature)
        WHERE coalesce(aggregatesEdge.deleted, false) = false
      WITH feature, collect(DISTINCT CASE
        WHEN service IS NULL THEN NULL
        ELSE {id: service.id, name: service.name}
      END) AS services
      RETURN feature, services
      ORDER BY feature.name ASC
    `;
    const result = await this.neo4jService.read(query, { unitId: data.unitId });
    return result.records
      .map((record) => {
        const node = record.get('feature');
        if (!isGraphNode(node)) return null;
        return {
          ...mapNodeToFeature(node),
          services: filterIdNames(record.get('services')),
        };
      })
      .filter((row): row is FeatureWithServices => row !== null);
  }

  async findById(id: string): Promise<FeatureWithServices | null> {
    const query = `MATCH (feature:Feature {id: $id}) RETURN feature`;
    const result = await this.neo4jService.read(query, { id });
    const node = result.records[0]?.get('feature');
    if (!isGraphNode(node)) return null;

    const servicesResult = await this.neo4jService.read(activeServicesForFeatureQuery, {
      featureId: id,
    });
    const services = idNamesFromProjectRecords(servicesResult.records);

    return { ...mapNodeToFeature(node), services };
  }

  async update(id: string, data: UpdateFeatureDto): Promise<FeatureWithServices | null> {
    const readResult = await this.neo4jService.read(
      `MATCH (feature:Feature {id: $id}) RETURN feature`,
      { id },
    );
    const existing = readResult.records[0]?.get('feature');
    if (!isGraphNode(existing)) return null;
    const previous = mapNodeToFeature(existing);

    if (data.name !== undefined) {
      await assertNameUnchangedThenUnique({
        neo4jService: this.neo4jService,
        label: 'Feature',
        scope: 'unit',
        unitId: previous.unitId,
        entityId: id,
        name: data.name,
        storedName: previous.name,
      });
    }

    const parts = [
      optionalDescriptionSet(data.description, 'description'),
    ].filter((part): part is NonNullable<typeof part> => part !== null);

    if (parts.length > 0) {
      const { setClause, params } = mergeCypherSetParts(parts, 'feature');
      const query = `
        MATCH (feature:Feature {id: $id})
        ${setClause}
      `;
      await this.neo4jService.write(query, { id, ...params });
    }

    if (data.serviceIds !== undefined) {
      await this.neo4jService.write(
        `
        MATCH (service:Service)-[aggregatesEdge:AGGREGATES]->(:Feature {id: $featureId})
        WHERE coalesce(aggregatesEdge.deleted, false) = false
          AND NOT service.id IN $keepServiceIds
        SET aggregatesEdge.deleted = true
        `,
        { featureId: id, keepServiceIds: data.serviceIds },
      );

      if (data.serviceIds.length > 0) {
        const unitResult = await this.neo4jService.read(
          `MATCH (feature:Feature {id: $id}) RETURN feature.unitId AS value`,
          { id },
        );
        const unitId = unitResult.records[0]?.get('value');

        for (const serviceId of data.serviceIds) {
          const existsResult = await this.neo4jService.read(
            `
            MATCH (:Service {id: $serviceId})-[aggregatesEdge:AGGREGATES]->(:Feature {id: $featureId})
            WHERE coalesce(aggregatesEdge.deleted, false) = false
            RETURN count(aggregatesEdge) AS value
            `,
            { serviceId, featureId: id },
          );
          const exists = Number(existsResult.records[0]?.get('value') ?? 0) > 0;

          if (!exists) {
            await this.neo4jService.write(
              `
              MATCH (service:Service {id: $serviceId, unitId: $unitId}), (feature:Feature {id: $featureId})
              CREATE (service)-[:AGGREGATES {id: $edgeId, deleted: false}]->(feature)
              `,
              { serviceId, unitId, featureId: id, edgeId: randomUUID() },
            );
          }
        }
      }
    }

    return this.findById(id);
  }

  async delete(id: string) {
    await this.neo4jService.write(
      `MATCH (feature:Feature {id: $id}) DETACH DELETE feature`,
      { id },
    );
    return { id };
  }
}
