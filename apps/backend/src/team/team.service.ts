import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mergeCypherSetParts, optionalDescriptionSet } from '../common/set-parts';
import { assertUnitScopedNameUnique, normalizeEntityName } from '../common/entity-name';
import { getGraphNodeProperties } from '../common/graph-node-properties';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';

interface CreateTeamData {
  name: string;
  unitId: string;
  description?: string;
}

interface UpdateTeamData {
  name?: string;
  description?: string;
}

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

type ValidateTeamNameOnUpdateArgs = {
  readonly neo4jService: Neo4jService;
  readonly teamId: string;
  readonly unitId: string;
  readonly name: string;
  readonly storedName: string;
};

const validateTeamNameOnUpdate = async ({
  neo4jService,
  teamId,
  unitId,
  name,
  storedName,
}: ValidateTeamNameOnUpdateArgs): Promise<void> => {
  const normalized = normalizeEntityName(name);
  if (normalized !== normalizeEntityName(storedName)) {
    throw new BadRequestException('Team name is immutable');
  }
  await assertUnitScopedNameUnique({
    neo4jService,
    label: 'Team',
    unitId,
    name: normalized,
    excludeId: teamId,
  });
};

@Injectable()
export class TeamService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(data: CreateTeamData) {
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

  async update(id: string, data: UpdateTeamData) {
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
      await validateTeamNameOnUpdate({
        neo4jService: this.neo4jService,
        teamId: id,
        unitId: previous.unitId,
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
