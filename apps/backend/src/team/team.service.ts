import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateTeamDto, UpdateTeamDto } from '@stellode/models';
import { mergeCypherSetParts, optionalDescriptionSet } from '../common/set-parts';
import {
  assertNameUnchangedThenUnique,
  assertUnitScopedNameUnique,
  normalizeEntityName,
} from '../common/entity-name';
import { getGraphNodeProperties } from '../common/graph-node-properties';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';

const toTeamDto = (node: GraphNode) => {
  const properties = getGraphNodeProperties(node);
  return {
    id: String(properties.id ?? node.id),
    unitId: String(properties.unitId ?? ''),
    name: String(properties.name ?? ''),
    description:
      properties.description === null || properties.description === undefined
        ? null
        : String(properties.description),
    type: String(properties.type ?? ''),
  };
};

@Injectable()
export class TeamService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(data: CreateTeamDto) {
    const name = normalizeEntityName(data.name);
    await assertUnitScopedNameUnique({
      neo4jService: this.neo4jService,
      label: 'Team',
      unitId: data.unitId,
      name,
    });
    const id = randomUUID();

    const query = `
      MATCH (unit:Unit {id: $unitId})
      CREATE (team:Team {id: $id, unitId: $unitId, name: $name, description: $description, type: 'team'})
      CREATE (unit)-[:HAS_TEAM]->(team)
      RETURN team
    `;

    const result = await this.neo4jService.write(query, {
      id,
      unitId: data.unitId,
      name,
      description: data.description ? data.description : null,
    });
    const node = result.records[0]?.get('team') as GraphNode | undefined;
    return node ? toTeamDto(node) : null;
  }

  async findAll(data: { unitId: string }) {
    const query = `
      MATCH (:Unit {id: $unitId})-[:HAS_TEAM]->(team:Team)
      RETURN team
      ORDER BY team.name ASC
    `;
    const result = await this.neo4jService.read(query, { unitId: data.unitId });
    return result.records
      .map((r) => r.get('value') as GraphNode | undefined)
      .filter((n): n is GraphNode => n !== undefined)
      .map(toTeamDto);
  }

  async update(id: string, data: UpdateTeamDto) {
    const readQuery = `
      MATCH (team:Team {id: $id})
      RETURN team
    `;
    const readResult = await this.neo4jService.read(readQuery, { id });
    const existing = readResult.records[0]?.get('value') as GraphNode | undefined;
    if (!existing) {
      return null;
    }

    const previous = toTeamDto(existing);

    if (data.name !== undefined) {
      await assertNameUnchangedThenUnique({
        neo4jService: this.neo4jService,
        label: 'Team',
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

    const { setClause, params } = mergeCypherSetParts(parts, 'team');
    const query = `
      MATCH (team:Team {id: $id})
      ${setClause}
      RETURN team
    `;

    const result = await this.neo4jService.write(query, { id, ...params });
    const node = result.records[0]?.get('value') as GraphNode | undefined;
    return node ? toTeamDto(node) : null;
  }

  async delete(id: string) {
    const query = `
      MATCH (team:Team {id: $id})
      DETACH DELETE team
    `;
    await this.neo4jService.write(query, { id });
    return { id };
  }
}
