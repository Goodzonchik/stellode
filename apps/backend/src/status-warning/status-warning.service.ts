import { Injectable, NotFoundException } from '@nestjs/common';
import {
  VersionStatus,
  parseVersionStatus,
  type ComponentVersionStatusWarning,
  type StatusWarningCandidate,
  type StatusWarningCandidateStatus,
  type StatusWarningComponentNeighbor,
  type StatusWarningFeature,
} from '@stellode/models';
import { Neo4jService, type GraphQueryRecord } from '../neo4j/neo4j.service';
import { mergeIdNameRows, type IdNameRow } from './merge-id-name-rows';
import { parseIdNameRow } from './parse-id-name-row';

const parseCandidateStatus = (raw: unknown): StatusWarningCandidateStatus | null => {
  if (raw === VersionStatus.Deprecated) return VersionStatus.Deprecated;
  if (raw === VersionStatus.Unactive) return VersionStatus.Unactive;
  return null;
};

const toCandidate = (record: GraphQueryRecord): StatusWarningCandidate | null => {
  const componentVersionId = record.get('componentVersionId');
  const componentId = record.get('componentId');
  const componentName = record.get('componentName');
  const version = record.get('version');
  const status = parseCandidateStatus(record.get('status'));
  if (typeof componentVersionId !== 'string' || componentVersionId.length === 0) return null;
  if (typeof componentId !== 'string' || typeof componentName !== 'string') return null;
  if (typeof version !== 'string' || status === null) return null;
  return { componentVersionId, componentId, componentName, version, status };
};

const toNeighbor = (record: GraphQueryRecord): StatusWarningComponentNeighbor | null => {
  const componentVersionId = record.get('componentVersionId');
  const componentId = record.get('componentId');
  const componentName = record.get('componentName');
  const version = record.get('version');
  const status = parseVersionStatus(record.get('status'));
  const direction = record.get('direction');
  if (typeof componentVersionId !== 'string' || componentVersionId.length === 0) return null;
  if (typeof componentId !== 'string' || typeof componentName !== 'string') return null;
  if (typeof version !== 'string' || status === null) return null;
  if (direction !== 'incoming' && direction !== 'outgoing') return null;
  return { componentVersionId, componentId, componentName, version, status, direction };
};

const toFeature = (record: GraphQueryRecord): StatusWarningFeature | null => {
  const id = record.get('featureId');
  const name = record.get('featureName');
  const versionId = record.get('versionId');
  const version = record.get('version');
  const status = parseVersionStatus(record.get('status'));
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (typeof versionId !== 'string' || typeof version !== 'string' || status === null) return null;
  return { id, name, versionId, version, status };
};

const collectIdNames = (records: readonly GraphQueryRecord[]): IdNameRow[] =>
  mergeIdNameRows(
    records
      .map((record) => parseIdNameRow(record.get('id'), record.get('name')))
      .filter((row): row is IdNameRow => row !== null),
  );

@Injectable()
export class StatusWarningService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async candidatesForApplication(applicationId: string): Promise<StatusWarningCandidate[]> {
    const exists = await this.neo4jService.read(
      `MATCH (app:Application {id: $applicationId}) RETURN app.id AS id`,
      { applicationId },
    );
    if (!exists.records[0]) throw new NotFoundException('Application not found');

    const query = `
      MATCH (app:Application {id: $applicationId})-[:HAS_VERSION]->(currentAv:ApplicationVersion {status: 'current'})
        -[:HAS_COMPONENT {status: 'deprecated'}]->(cv:ComponentVersion)
      MATCH (parent:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      RETURN cv.id AS componentVersionId, parent.id AS componentId, parent.name AS componentName,
        cv.version AS version, 'deprecated' AS status
      UNION
      MATCH (fv:FeatureVersion)-[uses:USES_COMPONENT_VERSION]->(cv:ComponentVersion {status: 'unactive'})
      WHERE uses.applicationId = $applicationId
        AND fv.status IN ['draft', 'active', 'deprecated']
      MATCH (parent:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      RETURN cv.id AS componentVersionId, parent.id AS componentId, parent.name AS componentName,
        cv.version AS version, 'unactive' AS status
    `;
    const result = await this.neo4jService.read(query, { applicationId });
    const rows = result.records
      .map(toCandidate)
      .filter((row): row is StatusWarningCandidate => row !== null);
    const byId = new Map<string, StatusWarningCandidate>();
    for (const row of rows) {
      if (!byId.has(row.componentVersionId)) byId.set(row.componentVersionId, row);
    }
    return Array.from(byId.values()).sort((left, right) =>
      `${left.componentName}:${left.version}`.localeCompare(`${right.componentName}:${right.version}`),
    );
  }

  async statusWarningForComponentVersion(
    componentVersionId: string,
  ): Promise<ComponentVersionStatusWarning> {
    const seed = await this.neo4jService.read(
      `
      MATCH (parent:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion {id: $componentVersionId})
      RETURN cv.id AS componentVersionId, parent.id AS componentId, parent.name AS componentName,
        cv.version AS version, cv.status AS status
      `,
      { componentVersionId },
    );
    const seedRow = seed.records[0];
    if (!seedRow) throw new NotFoundException('ComponentVersion not found');
    const status = parseVersionStatus(seedRow.get('status'));
    const componentId = seedRow.get('componentId');
    const componentName = seedRow.get('componentName');
    const version = seedRow.get('version');
    if (status === null || typeof componentId !== 'string' || typeof componentName !== 'string') {
      throw new NotFoundException('ComponentVersion not found');
    }
    if (typeof version !== 'string') throw new NotFoundException('ComponentVersion not found');

    const [components, applications, teams, features, services] = await Promise.all([
      this.#loadNeighbors(componentVersionId),
      this.#loadApplications(componentVersionId),
      this.#loadTeams(componentVersionId),
      this.#loadFeatures(componentVersionId),
      this.#loadServices(componentVersionId),
    ]);

    return {
      componentVersionId,
      componentId,
      componentName,
      version,
      status,
      applications,
      teams,
      components,
      features,
      services,
    };
  }

  async #loadNeighbors(componentVersionId: string): Promise<StatusWarningComponentNeighbor[]> {
    const query = `
      MATCH (cv:ComponentVersion {id: $componentVersionId})
      OPTIONAL MATCH (cv)-[:DEPENDS_ON]->(prov:ComponentVersion)
      WHERE prov.status IN ['active', 'deprecated']
        AND (coalesce(prov.unitId, '') = coalesce(cv.unitId, '') OR coalesce(prov.isPublic, false) = true)
      OPTIONAL MATCH (provParent:Component)-[:HAS_VERSION|HAS_DRAFT]->(prov)
      OPTIONAL MATCH (cons:ComponentVersion)-[:DEPENDS_ON]->(cv)
      WHERE cons.status IN ['active', 'deprecated']
        AND (coalesce(cons.unitId, '') = coalesce(cv.unitId, '') OR coalesce(cv.isPublic, false) = true)
      OPTIONAL MATCH (consParent:Component)-[:HAS_VERSION|HAS_DRAFT]->(cons)
      WITH collect(DISTINCT CASE WHEN prov IS NULL THEN null ELSE {
        componentVersionId: prov.id,
        componentId: provParent.id,
        componentName: coalesce(provParent.name, ''),
        version: prov.version,
        status: prov.status,
        direction: 'outgoing'
      } END) AS outRows,
      collect(DISTINCT CASE WHEN cons IS NULL THEN null ELSE {
        componentVersionId: cons.id,
        componentId: consParent.id,
        componentName: coalesce(consParent.name, ''),
        version: cons.version,
        status: cons.status,
        direction: 'incoming'
      } END) AS inRows
      UNWIND (outRows + inRows) AS row
      WITH row WHERE row IS NOT NULL
      RETURN row.componentVersionId AS componentVersionId,
        row.componentId AS componentId,
        row.componentName AS componentName,
        row.version AS version,
        row.status AS status,
        row.direction AS direction
      ORDER BY row.componentName ASC, row.version ASC
    `;
    const result = await this.neo4jService.read(query, { componentVersionId });
    return result.records
      .map(toNeighbor)
      .filter((row): row is StatusWarningComponentNeighbor => row !== null);
  }

  async #loadApplications(componentVersionId: string): Promise<IdNameRow[]> {
    const query = `
      MATCH (cv:ComponentVersion {id: $componentVersionId})
      OPTIONAL MATCH (cv)-[outDep:DEPENDS_ON]->(prov:ComponentVersion)
      WHERE prov.status IN ['active', 'deprecated']
        AND (coalesce(prov.unitId, '') = coalesce(cv.unitId, '') OR coalesce(prov.isPublic, false) = true)
      OPTIONAL MATCH (cons:ComponentVersion)-[inDep:DEPENDS_ON]->(cv)
      WHERE cons.status IN ['active', 'deprecated']
        AND (coalesce(cons.unitId, '') = coalesce(cv.unitId, '') OR coalesce(cv.isPublic, false) = true)
      OPTIONAL MATCH (appFromCtx:Application)
      WHERE appFromCtx.id IN [
        outDep.consumerApplicationId, outDep.providerApplicationId,
        inDep.consumerApplicationId, inDep.providerApplicationId
      ]
      OPTIONAL MATCH (appHas:Application)-[:HAS_VERSION]->(:ApplicationVersion {status: 'current'})
        -[:HAS_COMPONENT]->(member:ComponentVersion)
      WHERE member.id = cv.id OR member.id = prov.id OR member.id = cons.id
      OPTIONAL MATCH (fv:FeatureVersion)-[uses:USES_COMPONENT_VERSION]->(cv)
      WHERE fv.status IN ['draft', 'active', 'deprecated']
      OPTIONAL MATCH (appUses:Application {id: uses.applicationId})
      WITH collect(DISTINCT appFromCtx) + collect(DISTINCT appHas) + collect(DISTINCT appUses) AS apps
      UNWIND apps AS app
      WITH app WHERE app IS NOT NULL
      RETURN DISTINCT app.id AS id, app.name AS name
      ORDER BY app.name ASC
    `;
    const result = await this.neo4jService.read(query, { componentVersionId });
    return collectIdNames(result.records);
  }

  async #loadTeams(componentVersionId: string): Promise<IdNameRow[]> {
    const query = `
      MATCH (cv:ComponentVersion {id: $componentVersionId})
      OPTIONAL MATCH (ownTeam:Team)-[:MAINTAINS]->(ownParent:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      OPTIONAL MATCH (cv)-[:DEPENDS_ON]->(prov:ComponentVersion)
      WHERE prov.status IN ['active', 'deprecated']
        AND (coalesce(prov.unitId, '') = coalesce(cv.unitId, '') OR coalesce(prov.isPublic, false) = true)
      OPTIONAL MATCH (provTeam:Team)-[:MAINTAINS]->(provParent:Component)-[:HAS_VERSION|HAS_DRAFT]->(prov)
      OPTIONAL MATCH (cons:ComponentVersion)-[:DEPENDS_ON]->(cv)
      WHERE cons.status IN ['active', 'deprecated']
        AND (coalesce(cons.unitId, '') = coalesce(cv.unitId, '') OR coalesce(cv.isPublic, false) = true)
      OPTIONAL MATCH (consTeam:Team)-[:MAINTAINS]->(consParent:Component)-[:HAS_VERSION|HAS_DRAFT]->(cons)
      WITH collect(DISTINCT ownTeam) + collect(DISTINCT provTeam) + collect(DISTINCT consTeam) AS teams
      UNWIND teams AS team
      WITH team WHERE team IS NOT NULL
      RETURN DISTINCT team.id AS id, team.name AS name
      ORDER BY team.name ASC
    `;
    const result = await this.neo4jService.read(query, { componentVersionId });
    return collectIdNames(result.records);
  }

  async #loadFeatures(componentVersionId: string): Promise<StatusWarningFeature[]> {
    const query = `
      MATCH (fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion {id: $componentVersionId})
      WHERE fv.status IN ['draft', 'active', 'deprecated']
      MATCH (feature:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)
      RETURN DISTINCT feature.id AS featureId, feature.name AS featureName,
        fv.id AS versionId, fv.version AS version, fv.status AS status
      ORDER BY feature.name ASC, fv.version ASC
    `;
    const result = await this.neo4jService.read(query, { componentVersionId });
    return result.records.map(toFeature).filter((row): row is StatusWarningFeature => row !== null);
  }

  async #loadServices(componentVersionId: string): Promise<IdNameRow[]> {
    const query = `
      MATCH (fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion {id: $componentVersionId})
      WHERE fv.status IN ['draft', 'active', 'deprecated']
      MATCH (feature:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)
      MATCH (service:Service)-[agg:AGGREGATES]->(feature)
      WHERE coalesce(agg.deleted, false) = false
      RETURN DISTINCT service.id AS id, service.name AS name
      ORDER BY service.name ASC
    `;
    const result = await this.neo4jService.read(query, { componentVersionId });
    return collectIdNames(result.records);
  }
}
