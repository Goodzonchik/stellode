import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { parseVersionStatus, VersionStatus } from '@stellode/models';
import { filterIdNames, isGraphNode, requireGraphNode } from '../common/graph-helpers';
import { resolveComponentOrFeatureVersionString } from '../common/parent-version-uniqueness';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';
import type { CreateComponentVersionDto } from '@stellode/models';

const serializeCv = (node: GraphNode) => {
  const p = node.properties;
  const status = parseVersionStatus(p.status ?? p.state) ?? VersionStatus.Unactive;
  return { ...p, id: (p.id as string) ?? node.id, status };
};

const mapUsage = (raw: unknown) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row) => ({
      applicationId: String(row.applicationId ?? ''),
      applicationName: String(row.applicationName ?? ''),
      status: String(row.status ?? ''),
    }))
    .filter((row) => row.applicationId.length > 0);
};

@Injectable()
export class ComponentVersionService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async getByComponentElementId(componentElementId: string) {
    const query = `
      MATCH (component:Component {id: $componentId})-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
      OPTIONAL MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)
      OPTIONAL MATCH (app:Application {id: av.applicationId})
      WITH cv,
        collect(DISTINCT CASE WHEN av IS NOT NULL THEN {
          applicationId: av.applicationId,
          applicationName: app.name,
          status: hc.status
        } END) AS usage
      RETURN cv, usage
      ORDER BY cv.versionNumber DESC
    `;
    const result = await this.neo4jService.read(query, { componentId: componentElementId });
    return result.records.map((record) => {
      const cv = record.get('cv');
      if (!isGraphNode(cv)) return null;
      return { ...serializeCv(cv), usage: mapUsage(record.get('usage')) };
    }).filter((row): row is NonNullable<typeof row> => row !== null);
  }

  async forUnit(unitId: string) {
    const query = `
      MATCH (:Unit {id: $unitId})-[:HAS_TEAM]->(:Team)-[:MAINTAINS]->(component:Component)
      WITH DISTINCT component
      OPTIONAL MATCH (component)-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
      WITH component, cv
      ORDER BY cv.versionNumber DESC
      WITH component, collect(cv) AS versions
      OPTIONAL MATCH (team:Team)-[:MAINTAINS]->(component)
      WITH component, versions, collect({id: team.id, name: team.name}) AS teams
      RETURN component {.id, .name, .isDependency} AS component, versions, teams
      ORDER BY component.name ASC
    `;
    const result = await this.neo4jService.read(query, { unitId });
    const base = result.records.map((record) => {
      const componentValue = record.get('component');
      const componentRecord =
        typeof componentValue === 'object' && componentValue !== null
          ? (componentValue as Record<string, unknown>)
          : {};
      const teams = filterIdNames(record.get('teams'));
      const versionsRaw = record.get('versions');
      const versionsList = Array.isArray(versionsRaw) ? versionsRaw : [];
      const versions = versionsList.filter(isGraphNode).map(serializeCv);
      return {
        component: {
          id: String(componentRecord.id ?? ''),
          name: String(componentRecord.name ?? ''),
          isDependency: Boolean(componentRecord.isDependency),
        },
        versions,
        team: teams[0] ?? null,
      };
    });

    const allCvIds = [
      ...new Set(base.flatMap((row) => row.versions.map((v) => String(v.id ?? '')))),
    ].filter((id) => id.length > 0);
    if (allCvIds.length === 0) return base;

    const usageQuery = `
      UNWIND $ids AS cvId
      MATCH (cv:ComponentVersion {id: cvId})
      OPTIONAL MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)
      OPTIONAL MATCH (app:Application {id: av.applicationId})
      RETURN cv.id AS cvId,
        collect(DISTINCT CASE WHEN av IS NOT NULL THEN {
          applicationId: av.applicationId,
          applicationName: app.name,
          status: hc.status
        } END) AS usage
    `;
    const usageResult = await this.neo4jService.read(usageQuery, { ids: allCvIds });
    const usageByCv = new Map<string, ReturnType<typeof mapUsage>>();
    for (const record of usageResult.records) {
      usageByCv.set(String(record.get('cvId') ?? ''), mapUsage(record.get('usage')));
    }

    return base.map((row) => ({
      ...row,
      versions: row.versions.map((version) => ({
        ...version,
        usage: usageByCv.get(String(version.id ?? '')) ?? [],
      })),
    }));
  }

  async create(dto: CreateComponentVersionDto) {
    const id = randomUUID();

    const checkDraftQuery = `
      MATCH (component:Component {id: $componentId})-[:HAS_DRAFT]->(draft:ComponentVersion)
      RETURN count(draft) AS value
    `;
    const draftCheck = await this.neo4jService.read(checkDraftQuery, {
      componentId: dto.componentElementId,
    });
    const draftCount = Number(draftCheck.records[0]?.get('value') ?? 0);
    if (draftCount > 0) {
      throw new BadRequestException('Component already has a draft version');
    }

    const versionString = await resolveComponentOrFeatureVersionString(
      this.neo4jService,
      'Component',
      dto.componentElementId,
      dto.version,
    );

    const createQuery = `
      MATCH (component:Component {id: $componentId})
      OPTIONAL MATCH (component)-[:HAS_VERSION|HAS_DRAFT]->(candidate:ComponentVersion)
      WITH component, candidate
      ORDER BY
        CASE WHEN candidate.status IN ['active', 'deprecated'] THEN 0 ELSE 1 END ASC,
        coalesce(candidate.versionNumber, -1) DESC
      WITH component, collect(candidate)[0] AS base
      CREATE (newDraft:ComponentVersion {
        id: $id,
        componentId: $componentId,
        unitId: component.unitId,
        versionNumber: coalesce(base.versionNumber, -1) + 1,
        version: $version,
        status: 'draft',
        description: coalesce(base.description, ''),
        name: component.name,
        type: 'componentVersion',
        isPublic: coalesce(component.isPublic, false),
        contract: '{}'
      })
      CREATE (component)-[:HAS_DRAFT]->(newDraft)
      FOREACH (previous IN CASE WHEN base IS NULL THEN [] ELSE [base] END |
        CREATE (newDraft)-[:INHERITED]->(previous)
      )
      RETURN newDraft
    `;

    const result = await this.neo4jService.write(createQuery, {
      componentId: dto.componentElementId,
      id,
      version: versionString,
    });
    const node = requireGraphNode(result.records[0]?.get('newDraft'));

    const copyDependsOnQuery = `
      MATCH (newDraft:ComponentVersion {id: $id})
      MATCH (:Component {id: $componentId})-[:HAS_VERSION|HAS_DRAFT]->(latest:ComponentVersion)
      WHERE latest.id <> $id
      WITH newDraft, latest
      ORDER BY
        CASE WHEN latest.status IN ['active', 'deprecated'] THEN 0 ELSE 1 END ASC,
        coalesce(latest.versionNumber, -1) DESC
      LIMIT 1
      MATCH (latest)-[oldEdge:DEPENDS_ON]->(target:ComponentVersion)
      CREATE (newDraft)-[newEdge:DEPENDS_ON]->(target)
      SET newEdge = properties(oldEdge)
    `;
    await this.neo4jService.write(copyDependsOnQuery, {
      id,
      componentId: dto.componentElementId,
    });

    return serializeCv(node);
  }
}
