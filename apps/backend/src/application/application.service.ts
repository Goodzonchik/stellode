import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ApplicationEntityType,
  ApplicationVersionStatus,
  type ApplicationListItem,
  type ApplicationVersionStatus as ApplicationVersionStatusType,
  type CreateApplicationDto,
  type UpdateApplicationDto,
} from '@stellode/models';
import { mergeCypherSetParts, optionalDescriptionSet } from '../common/set-parts';
import {
  assertNameUnchangedThenUnique,
  assertUnitScopedNameUnique,
  normalizeEntityName,
} from '../common/entity-name';
import { getGraphNodeProperties } from '../common/graph-node-properties';
import { Neo4jService, type GraphNode, type GraphQueryRecord } from '../neo4j/neo4j.service';

const toApplicationDto = (node: GraphNode) => {
  const properties = getGraphNodeProperties(node);
  return {
    id: String(properties.id ?? node.id),
    unitId: String(properties.unitId ?? ''),
    name: String(properties.name ?? ''),
    description:
      properties.description === null || properties.description === undefined
        ? null
        : String(properties.description),
    type: ApplicationEntityType.Application,
  };
};

const parseListVersionStatus = (raw: unknown): ApplicationVersionStatusType | null => {
  if (raw === ApplicationVersionStatus.Current) return ApplicationVersionStatus.Current;
  if (raw === ApplicationVersionStatus.Previous) return ApplicationVersionStatus.Previous;
  return null;
};

const toHasStatusWarning = (raw: unknown): boolean => raw === true;

const toApplicationListItem = (record: GraphQueryRecord): ApplicationListItem | null => {
  const node = record.get('app') as GraphNode | null | undefined;
  if (!node) return null;
  const versionRaw = record.get('currentVersion');
  const currentVersion =
    versionRaw === null || versionRaw === undefined ? null : String(versionRaw);
  return {
    ...toApplicationDto(node),
    currentVersion,
    currentVersionStatus: parseListVersionStatus(record.get('currentVersionStatus')),
    hasStatusWarning: toHasStatusWarning(record.get('hasStatusWarning')),
  };
};

@Injectable()
export class ApplicationService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(data: CreateApplicationDto) {
    const name = normalizeEntityName(data.name);
    await assertUnitScopedNameUnique({
      neo4jService: this.neo4jService,
      label: 'Application',
      unitId: data.unitId,
      name,
    });
    const id = randomUUID();

    const query = `
      MATCH (unit:Unit {id: $unitId})
      CREATE (app:Application {id: $id, unitId: $unitId, name: $name, description: $description, type: 'app'})
      CREATE (unit)-[:OWNS]->(app)
      RETURN app
    `;

    const result = await this.neo4jService.write(query, {
      id,
      unitId: data.unitId,
      name,
      description: data.description ? data.description : null,
    });
    const node = result.records[0]?.get('app') as GraphNode | undefined;
    return node ? toApplicationDto(node) : null;
  }

  async findAll(data: { unitId: string }): Promise<ApplicationListItem[]> {
    const query = `
      MATCH (:Unit {id: $unitId})-[:OWNS]->(app:Application)
      OPTIONAL MATCH (app)-[:HAS_VERSION]->(currentAv:ApplicationVersion {status: 'current'})
      OPTIONAL MATCH (app)-[:HAS_VERSION]->(anyAv:ApplicationVersion)
      WITH app, currentAv, anyAv
      ORDER BY coalesce(anyAv.versionNumber, -1) DESC
      WITH app, head(collect(currentAv)) AS currentAv, head(collect(anyAv)) AS latestAv
      WITH app, currentAv, latestAv,
        CASE
          WHEN currentAv IS NOT NULL AND exists {
            (currentAv)-[:HAS_COMPONENT {status: 'deprecated'}]->(:ComponentVersion)
          } THEN true
          WHEN exists {
            (fv:FeatureVersion)-[uses:USES_COMPONENT_VERSION]->(:ComponentVersion {status: 'unactive'})
            WHERE uses.applicationId = app.id
              AND fv.status IN ['draft', 'active', 'deprecated']
          } THEN true
          ELSE false
        END AS hasStatusWarning
      RETURN app,
        CASE
          WHEN currentAv IS NOT NULL THEN currentAv.version
          ELSE latestAv.version
        END AS currentVersion,
        CASE
          WHEN currentAv IS NOT NULL THEN 'current'
          WHEN latestAv IS NOT NULL THEN 'previous'
          ELSE null
        END AS currentVersionStatus,
        hasStatusWarning
      ORDER BY app.name ASC
    `;
    const result = await this.neo4jService.read(query, { unitId: data.unitId });
    return result.records
      .map(toApplicationListItem)
      .filter((row): row is ApplicationListItem => row !== null);
  }

  async update(id: string, data: UpdateApplicationDto) {
    const readQuery = `
      MATCH (app:Application {id: $id})
      RETURN app
    `;
    const readResult = await this.neo4jService.read(readQuery, { id });
    const existing = readResult.records[0]?.get('value') as GraphNode | undefined;
    if (!existing) {
      return null;
    }

    const previous = toApplicationDto(existing);

    if (data.name !== undefined) {
      await assertNameUnchangedThenUnique({
        neo4jService: this.neo4jService,
        label: 'Application',
        scope: 'unit',
        unitId: previous.unitId,
        entityId: id,
        name: data.name,
        storedName: previous.name,
      });
    }

    const parts = [
      optionalDescriptionSet(data.description, 'description'),
    ].filter((p): p is NonNullable<typeof p> => p !== null);

    if (parts.length === 0) {
      return previous;
    }

    const { setClause, params } = mergeCypherSetParts(parts, 'app');
    const query = `
      MATCH (app:Application {id: $id})
      ${setClause}
      RETURN app
    `;

    const result = await this.neo4jService.write(query, { id, ...params });
    const node = result.records[0]?.get('value') as GraphNode | undefined;
    return node ? toApplicationDto(node) : null;
  }

  async delete(id: string) {
    const query = `
      MATCH (app:Application {id: $id})
      DETACH DELETE app
    `;
    await this.neo4jService.write(query, { id });
    return { id };
  }
}
