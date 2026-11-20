import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ComponentEntityType,
  type ComponentWithTeam,
} from '@stellode/models';
import { mergeCypherSetParts, optionalDescriptionSet } from '../common/set-parts';
import { assertUnitScopedNameUnique, normalizeEntityName } from '../common/entity-name';
import { isGraphNode } from '../common/graph-helpers';
import { getGraphNodeProperties } from '../common/graph-node-properties';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';

export type { ComponentWithTeam };

interface CreateComponentData {
  name: string;
  unitId: string;
  teamId: string;
  description?: string;
  isDependency?: boolean;
  isPublic?: boolean;
}

interface UpdateComponentData {
  name?: string;
  description?: string;
  teamId?: string;
  unitId?: string;
}

const mapNodeToComponent = (
  node: GraphNode,
  team: { id: string; name: string } | null = null,
): ComponentWithTeam => {
  const p = getGraphNodeProperties(node);
  return {
    id: String(p.id ?? node.id),
    unitId: String(p.unitId ?? ''),
    name: String(p.name ?? ''),
    description:
      p.description === null || p.description === undefined ? null : String(p.description),
    type: ComponentEntityType.Component,
    isDependency: Boolean(p.isDependency),
    isPublic: Boolean(p.isPublic),
    team,
  };
};

const teamFromColumns = (
  teamId: unknown,
  teamName: unknown,
): { id: string; name: string } | null =>
  typeof teamId === 'string' && teamId.length > 0
    ? { id: teamId, name: typeof teamName === 'string' ? teamName : String(teamName ?? '') }
    : null;

type ValidateComponentNameOnUpdateArgs = {
  readonly neo4jService: Neo4jService;
  readonly componentId: string;
  readonly unitId: string;
  readonly name: string;
  readonly storedName: string;
};

const validateComponentNameOnUpdate = async ({
  neo4jService,
  componentId,
  unitId,
  name,
  storedName,
}: ValidateComponentNameOnUpdateArgs): Promise<void> => {
  const normalized = normalizeEntityName(name);
  if (normalized !== normalizeEntityName(storedName)) {
    throw new BadRequestException('Component name is immutable');
  }
  await assertUnitScopedNameUnique({
    neo4jService,
    label: 'Component',
    unitId,
    name: normalized,
    excludeId: componentId,
  });
};

@Injectable()
export class ComponentService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(data: CreateComponentData) {
    const name = normalizeEntityName(data.name);
    await assertUnitScopedNameUnique({
      neo4jService: this.neo4jService,
      label: 'Component',
      unitId: data.unitId,
      name,
    });
    const isDependency = data.isDependency ?? false;
    const isPublic = data.isPublic ?? false;
    const id = randomUUID();
    const versionId = randomUUID();
    const nodeType = isDependency ? 'dependency' : 'component';

    const query = `
      MATCH (team:Team {id: $teamId, unitId: $unitId})
      CREATE (component:Component {
        id: $id,
        unitId: $unitId,
        name: $name,
        description: $description,
        type: $type,
        isDependency: $isDependency,
        isPublic: $isPublic
      })
      CREATE (team)-[:MAINTAINS]->(component)
      CREATE (cv:ComponentVersion {
        id: $versionId,
        componentId: $id,
        unitId: $unitId,
        versionNumber: 0,
        version: '0',
        status: 'draft',
        isPublic: $isPublic,
        contract: '{}',
        type: 'componentVersion'
      })
      CREATE (component)-[:HAS_DRAFT]->(cv)
      RETURN component, team.id AS teamId, team.name AS teamName
    `;

    const result = await this.neo4jService.write(query, {
      teamId: data.teamId,
      unitId: data.unitId,
      id,
      name,
      description: data.description ? data.description : null,
      type: nodeType,
      isDependency,
      isPublic,
      versionId,
    });
    const record = result.records[0];
    const node = record?.get('component');
    if (!record || !isGraphNode(node)) return null;
    const team = teamFromColumns(record.get('teamId'), record.get('teamName'));
    return { ...mapNodeToComponent(node, team), draftComponentVersionId: versionId };
  }

  async getComponentsByUnitElementId(unitId: string): Promise<ComponentWithTeam[]> {
    const query = `
      MATCH (:Unit {id: $unitId})-[:HAS_TEAM]->(team:Team)-[:MAINTAINS]->(component:Component)
      RETURN DISTINCT component, team.id AS teamId, team.name AS teamName
      ORDER BY component.name ASC
    `;
    const result = await this.neo4jService.read(query, { unitId });

    return result.records.flatMap((record) => {
      const component = record.get('component');
      if (!isGraphNode(component)) return [];
      const team = teamFromColumns(record.get('teamId'), record.get('teamName'));
      return [mapNodeToComponent(component, team)];
    });
  }

  async findOne(id: string): Promise<ComponentWithTeam | null> {
    const query = `
      MATCH (component:Component {id: $id})
      OPTIONAL MATCH (team:Team)-[:MAINTAINS]->(component)
      RETURN component, team.id AS teamId, team.name AS teamName
      LIMIT 1
    `;
    const result = await this.neo4jService.read(query, { id });
    const record = result.records[0];
    if (!record) return null;
    const component = record.get('component');
    if (!isGraphNode(component)) return null;
    const team = teamFromColumns(record.get('teamId'), record.get('teamName'));
    return mapNodeToComponent(component, team);
  }

  async update(id: string, data: UpdateComponentData): Promise<ComponentWithTeam | null> {
    if (data.name !== undefined) {
      const existing = await this.findOne(id);
      if (!existing) {
        return null;
      }
      const unitId = data.unitId ?? existing.unitId;
      await validateComponentNameOnUpdate({
        neo4jService: this.neo4jService,
        componentId: id,
        unitId,
        name: data.name,
        storedName: existing.name,
      });
    }
    const parts = [optionalDescriptionSet(data.description, 'description')].filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );

    if (parts.length > 0) {
      const { setClause, params } = mergeCypherSetParts(parts, 'component');
      const query = `
        MATCH (component:Component {id: $id})
        ${setClause}
      `;
      await this.neo4jService.write(query, { id, ...params });
    }

    if (data.teamId !== undefined && data.unitId !== undefined) {
      const removeQuery = `
        MATCH (component:Component {id: $id})<-[maintains:MAINTAINS]-()
        DELETE maintains
      `;
      await this.neo4jService.write(removeQuery, { id });

      const addQuery = `
        MATCH (team:Team {id: $teamId, unitId: $unitId})
        MATCH (component:Component {id: $id})
        CREATE (team)-[:MAINTAINS]->(component)
      `;
      await this.neo4jService.write(addQuery, {
        teamId: data.teamId,
        unitId: data.unitId,
        id,
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const deleteVersionsQuery = `
      MATCH (cv:ComponentVersion {componentId: $id})
      DETACH DELETE cv
    `;
    await this.neo4jService.write(deleteVersionsQuery, { id });

    const deleteComponentQuery = `
      MATCH (component:Component {id: $id})
      DETACH DELETE component
    `;
    await this.neo4jService.write(deleteComponentQuery, { id });

    return { id };
  }
}
