import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mergeCypherSetParts, optionalDescriptionSet } from '../common/set-parts';
import {
  assertGlobalNameUnique,
  assertNameUnchangedThenUnique,
  normalizeEntityName,
} from '../common/entity-name';
import { getGraphNodeProperties } from '../common/graph-node-properties';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';
import type { CreateUnitDto, UpdateUnitDto } from '@stellode/models';

const toUnitDto = (node: GraphNode) => {
  const properties = getGraphNodeProperties(node);
  return {
    id: String(properties.id ?? node.id),
    name: String(properties.name ?? ''),
    description:
      properties.description === null || properties.description === undefined
        ? null
        : String(properties.description),
    type: String(properties.type ?? ''),
  };
};

@Injectable()
export class UnitService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async create(data: CreateUnitDto) {
    const name = normalizeEntityName(data.name);
    await assertGlobalNameUnique({
      neo4jService: this.neo4jService,
      label: 'Unit',
      name,
    });
    const id = randomUUID();

    const query = `
      CREATE (t:Unit {id: $id, name: $name, description: $description, type: 'unit'})
      RETURN t
    `;

    const result = await this.neo4jService.write(query, {
      id,
      name,
      description: data.description ? data.description : null,
    });
    const node = result.records[0]?.get('value') as GraphNode | undefined;
    return node ? toUnitDto(node) : null;
  }

  async findAll() {
    const query = `
      MATCH (t:Unit)
      RETURN t
      ORDER BY t.name ASC
    `;
    const result = await this.neo4jService.read(query);
    return result.records
      .map((r) => r.get('value') as GraphNode | undefined)
      .filter((n): n is GraphNode => n !== undefined)
      .map(toUnitDto);
  }

  async update(id: string, data: UpdateUnitDto) {
    const readQuery = `
      MATCH (t:Unit {id: $id})
      RETURN t
    `;
    const readResult = await this.neo4jService.read(readQuery, { id });
    const existing = readResult.records[0]?.get('value') as GraphNode | undefined;
    if (!existing) {
      return null;
    }

    const previous = toUnitDto(existing);

    if (data.name !== undefined) {
      await assertNameUnchangedThenUnique({
        neo4jService: this.neo4jService,
        label: 'Unit',
        scope: 'global',
        entityId: id,
        name: data.name,
        storedName: previous.name,
      });
    }

    const parts = [optionalDescriptionSet(data.description, 'description')].filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );

    if (parts.length === 0) {
      return previous;
    }

    const { setClause, params } = mergeCypherSetParts(parts, 't');
    const query = `
      MATCH (t:Unit {id: $id})
      ${setClause}
      RETURN t
    `;

    const result = await this.neo4jService.write(query, { id, ...params });
    const node = result.records[0]?.get('value') as GraphNode | undefined;
    return node ? toUnitDto(node) : null;
  }

  async delete(id: string) {
    const query = `
      MATCH (t:Unit {id: $id})
      DETACH DELETE t
    `;
    await this.neo4jService.write(query, { id });
    return { id };
  }
}
