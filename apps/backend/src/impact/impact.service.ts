import { Injectable } from '@nestjs/common';
import {
  GraphProjection,
  ImpactAnomalyCode,
  type ImpactAnalysisResult,
  type ImpactAnomaly,
  type ImpactApplicationDetail,
  type ImpactIdName,
  type ImpactQueryMode as SharedImpactQueryMode,
  parseVersionStatus,
  VersionStatus,
} from '@stellode/models';
import { idNamesFromProjectRecords, isGraphNode } from '../common/graph-helpers';
import { Neo4jService, type GraphNode, type GraphQueryResult } from '../neo4j/neo4j.service';

export type ImpactQueryMode = SharedImpactQueryMode;

const emptyImpactAnalysisResult = (mode: ImpactQueryMode): ImpactAnalysisResult => ({
  mode,
  anomalies: [],
  units: [],
  teams: [],
  services: [],
  features: [],
  applications: [],
  components: [],
  consumers: [],
  providers: [],
});

type DependsOnPairRow = Readonly<Record<string, unknown>>;

const isDependsOnPairRow = (v: unknown): v is DependsOnPairRow =>
  typeof v === 'object' && v !== null && 'fromId' in v && 'toId' in v;

const toStatus = (raw: unknown): VersionStatus | null => parseVersionStatus(raw);

const isStatusWarningPair = (from: VersionStatus, to: VersionStatus): boolean => {
  const key = `${from}->${to}` as const;
  return (
    key === 'active->draft' ||
    key === 'active->deprecated' ||
    key === 'deprecated->draft' ||
    key === 'deprecated->deprecated' ||
    key === 'active->unactive' ||
    key === 'deprecated->unactive'
  );
};

const anomaliesFromDependsOnPairs = (pairsRaw: unknown, mode: ImpactQueryMode): ImpactAnomaly[] => {
  if (mode !== GraphProjection.OnProd) return [];
  const pairs = Array.isArray(pairsRaw) ? pairsRaw.filter(isDependsOnPairRow) : [];

  return pairs.flatMap((p) => {
    const fromId = typeof p.fromId === 'string' ? p.fromId : undefined;
    const toId = typeof p.toId === 'string' ? p.toId : undefined;
    const fromStatus = toStatus(p.fromStatus);
    const toStatusV = toStatus(p.toStatus);

    const crossUnit =
      typeof p.fromUnitId === 'string' &&
      typeof p.toUnitId === 'string' &&
      p.fromUnitId.length > 0 &&
      p.toUnitId.length > 0 &&
      p.fromUnitId !== p.toUnitId;
    const targetIsPublic = typeof p.targetIsPublic === 'boolean' ? p.targetIsPublic : false;

    const nonPublic =
      crossUnit && !targetIsPublic
        ? [
            {
              code: ImpactAnomalyCode.CrossUnitNonPublic,
              message:
                'Cross-unit DEPENDS_ON requires provider ComponentVersion.isPublic = true (spec §9).',
              fromComponentVersionId: fromId,
              toComponentVersionId: toId,
              fromStatus: fromStatus ?? undefined,
              toStatus: toStatusV ?? undefined,
            } satisfies ImpactAnomaly,
          ]
        : [];

    const unactiveTarget =
      toStatusV === VersionStatus.Unactive
        ? [
            {
              code: ImpactAnomalyCode.DependsOnUnactiveTarget,
              message:
                'DEPENDS_ON points to unactive ComponentVersion in production projection (spec §10–§11).',
              fromComponentVersionId: fromId,
              toComponentVersionId: toId,
              fromStatus: fromStatus ?? undefined,
              toStatus: toStatusV,
            } satisfies ImpactAnomaly,
          ]
        : [];

    const statusWarning =
      fromStatus && toStatusV && isStatusWarningPair(fromStatus, toStatusV)
        ? [
            {
              code: ImpactAnomalyCode.DependsOnStatusWarning,
              message:
                'DEPENDS_ON connects statuses that are warnings in production validation (spec §10).',
              fromComponentVersionId: fromId,
              toComponentVersionId: toId,
              fromStatus,
              toStatus: toStatusV,
            } satisfies ImpactAnomaly,
          ]
        : [];

    return [...nonPublic, ...unactiveTarget, ...statusWarning];
  });
};

const whereClause = (conditions: readonly string[]): string =>
  conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

const cvStatusConditions = (mode: ImpactQueryMode): string[] =>
  mode === GraphProjection.OnProd ? [`cv.status IN ['active', 'deprecated']`] : [];

const fvStatusConditions = (mode: ImpactQueryMode): string[] =>
  mode === GraphProjection.OnProd ? [`fv.status = 'active'`] : [];

const avStatusConditions = (mode: ImpactQueryMode): string[] =>
  mode === GraphProjection.OnProd ? [`av.status = 'current'`] : [];

const aggregatesActiveConditions = (mode: ImpactQueryMode): string[] =>
  mode === GraphProjection.OnProd ? [`(agg.deleted IS NULL OR agg.deleted = false)`] : [];

const serviceOperationalConditions = (mode: ImpactQueryMode): string[] =>
  mode === GraphProjection.OnProd ? [`(svc.status IS NULL OR svc.status <> 'archive')`] : [];

const cvNodesFromRecords = (result: GraphQueryResult): GraphNode[] => {
  const out: GraphNode[] = [];
  for (const rec of result.records) {
    const cv = rec.get('cv');
    if (isGraphNode(cv)) out.push(cv);
  }
  return out;
};

const dedupeNodesByBusinessId = (nodes: readonly GraphNode[]): GraphNode[] => {
  const map = new Map<string, GraphNode>();
  for (const n of nodes) {
    const id = n.properties.id;
    if (typeof id === 'string' && id.length > 0 && !map.has(id)) map.set(id, n);
  }
  return [...map.values()];
};

const pairScvToProv = (scv: GraphNode, prov: GraphNode): DependsOnPairRow => ({
  fromId: scv.properties.id,
  toId: prov.properties.id,
  fromStatus: scv.properties.status,
  toStatus: prov.properties.status,
  fromUnitId: scv.properties.unitId,
  toUnitId: prov.properties.unitId,
  targetIsPublic: Boolean(prov.properties.isPublic),
});

const pairConsToScv = (cons: GraphNode, scv: GraphNode): DependsOnPairRow => ({
  fromId: cons.properties.id,
  toId: scv.properties.id,
  fromStatus: cons.properties.status,
  toStatus: scv.properties.status,
  fromUnitId: cons.properties.unitId,
  toUnitId: scv.properties.unitId,
  targetIsPublic: Boolean(scv.properties.isPublic),
});

@Injectable()
export class ImpactService {
  constructor(private readonly neo4jService: Neo4jService) {}

  private async query(
    seedQuery: string,
    parameters: Record<string, unknown>,
    mode: ImpactQueryMode,
  ): Promise<ImpactAnalysisResult> {
    const seedRes = await this.neo4jService.read(seedQuery, parameters);
    const seedCvs = dedupeNodesByBusinessId(cvNodesFromRecords(seedRes));
    if (seedCvs.length === 0) {
      return emptyImpactAnalysisResult(mode);
    }

    const expansion = await this.#expandDepends(seedCvs);
    const allCvs = dedupeNodesByBusinessId([
      ...seedCvs,
      ...expansion.providerCvs,
      ...expansion.consumerCvs,
    ]);

    const dependsOnPairs = [...expansion.outPairs, ...expansion.inPairs];
    const anomalies = anomaliesFromDependsOnPairs(dependsOnPairs, mode);

    const [consumerComps, providerComps, enrichMaps] = await Promise.all([
      this.#componentsForVersions(expansion.consumerCvs),
      this.#componentsForVersions(expansion.providerCvs),
      this.#enrichFromAllCvs(
        allCvs.map((n) => String(n.properties.id ?? '')).filter((id) => id.length > 0),
        mode,
      ),
    ]);

    return {
      mode,
      anomalies,
      units: enrichMaps.units,
      teams: enrichMaps.teams,
      services: enrichMaps.services,
      features: enrichMaps.features,
      applications: enrichMaps.applications,
      components: enrichMaps.components,
      consumers: consumerComps,
      providers: providerComps,
    } satisfies ImpactAnalysisResult;
  }

  async component(componentId: string, mode: ImpactQueryMode) {
    const seed = `MATCH (c:Component {id: $id})-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
      ${whereClause(cvStatusConditions(mode))}
      RETURN DISTINCT cv`;
    const base = await this.query(seed, { id: componentId }, mode);
    const seedRes = await this.neo4jService.read(seed, { id: componentId });
    const cvIds = dedupeNodesByBusinessId(cvNodesFromRecords(seedRes))
      .map((n) => String(n.properties.id ?? ''))
      .filter((id) => id.length > 0);
    const applicationsDetail = await this.#applicationsDetail(cvIds, mode);
    return { componentId, ...base, applicationsDetail };
  }

  async componentVersion(componentVersionId: string, mode: ImpactQueryMode) {
    const seed = `MATCH (cv:ComponentVersion {id: $id}) RETURN DISTINCT cv`;
    const base = await this.query(seed, { id: componentVersionId }, mode);
    const applicationsDetail = await this.#applicationsDetail([componentVersionId], mode);
    return { componentVersionId, ...base, applicationsDetail };
  }

  async unit(unitId: string, mode: ImpactQueryMode) {
    const seed = `MATCH (t:Unit {id: $id})-[:HAS_TEAM]->(:Team)-[:MAINTAINS]->(:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
      ${whereClause(cvStatusConditions(mode))}
      RETURN DISTINCT cv`;
    const base = await this.query(seed, { id: unitId }, mode);
    return { unitId, ...base };
  }

  async team(teamId: string, mode: ImpactQueryMode) {
    const seed = `MATCH (tm:Team {id: $id})-[:MAINTAINS]->(:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
      ${whereClause(cvStatusConditions(mode))}
      RETURN DISTINCT cv`;
    const base = await this.query(seed, { id: teamId }, mode);
    return { teamId, ...base };
  }

  async service(serviceId: string, mode: ImpactQueryMode) {
    if (mode === GraphProjection.OnProd) {
      const status = await this.#readServiceStatus(serviceId);
      if (status === 'archive') {
        return { serviceId, ...emptyImpactAnalysisResult(mode) };
      }
    }
    const conditions = [
      ...aggregatesActiveConditions(mode),
      ...fvStatusConditions(mode),
      ...cvStatusConditions(mode),
    ];
    const seed = `MATCH (s:Service {id: $id})-[agg:AGGREGATES]->(:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      ${whereClause(conditions)}
      RETURN DISTINCT cv`;
    const base = await this.query(seed, { id: serviceId }, mode);
    return { serviceId, ...base };
  }

  async feature(featureId: string, mode: ImpactQueryMode) {
    const conditions = [...fvStatusConditions(mode), ...cvStatusConditions(mode)];
    const seed = `MATCH (f:Feature {id: $id})-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      ${whereClause(conditions)}
      RETURN DISTINCT cv`;
    const base = await this.query(seed, { id: featureId }, mode);
    return { featureId, ...base };
  }

  async application(applicationId: string, mode: ImpactQueryMode) {
    const conditions = [...avStatusConditions(mode), ...cvStatusConditions(mode)];
    const seed = `MATCH (a:Application {id: $id})-[:HAS_VERSION]->(av:ApplicationVersion)-[:HAS_COMPONENT]->(cv:ComponentVersion)
      ${whereClause(conditions)}
      RETURN DISTINCT cv`;
    const base = await this.query(seed, { id: applicationId }, mode);
    const applicationsDetail = await this.#applicationsDetail(
      base.components.length > 0
        ? (
            await this.neo4jService.read(
              `MATCH (a:Application {id: $id})-[:HAS_VERSION]->(av:ApplicationVersion)-[:HAS_COMPONENT]->(cv:ComponentVersion)
               ${whereClause(conditions)}
               RETURN DISTINCT cv.id AS value`,
              { id: applicationId },
            )
          ).records
            .map((r) => String(r.get('value') ?? ''))
            .filter((id) => id.length > 0)
        : [],
      mode,
    );
    return { applicationId, ...base, applicationsDetail };
  }

  async #componentsForVersions(cvs: readonly GraphNode[]): Promise<ImpactIdName[]> {
    const ids = [
      ...new Set(
        cvs
          .map((n) => n.properties.componentId)
          .filter((x): x is string => typeof x === 'string' && x.length > 0),
      ),
    ];
    if (ids.length === 0) return [];
    const res = await this.neo4jService.read(
      `MATCH (c:Component) WHERE c.id IN $ids RETURN DISTINCT c.id AS id, c.name AS name`,
      { ids },
    );
    return idNamesFromProjectRecords(res.records);
  }

  async #expandDepends(seedCvs: readonly GraphNode[]): Promise<{
    providerCvs: GraphNode[];
    consumerCvs: GraphNode[];
    outPairs: DependsOnPairRow[];
    inPairs: DependsOnPairRow[];
  }> {
    const ids = seedCvs
      .map((n) => n.properties.id)
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (ids.length === 0) {
      return { providerCvs: [], consumerCvs: [], outPairs: [], inPairs: [] };
    }
    const query = `MATCH (scv:ComponentVersion) WHERE scv.id IN $ids
      OPTIONAL MATCH (scv)-[:DEPENDS_ON]->(prov:ComponentVersion)
      WHERE coalesce(prov.unitId, '') = coalesce(scv.unitId, '') OR prov.isPublic = true
      OPTIONAL MATCH (cons:ComponentVersion)-[:DEPENDS_ON]->(scv)
      WHERE coalesce(cons.unitId, '') = coalesce(scv.unitId, '') OR scv.isPublic = true
      RETURN scv, collect(DISTINCT prov) AS prov, collect(DISTINCT cons) AS cons`;

    const res = await this.neo4jService.read(query, { ids });
    const providerCvs: GraphNode[] = [];
    const consumerCvs: GraphNode[] = [];
    const outPairs: DependsOnPairRow[] = [];
    const inPairs: DependsOnPairRow[] = [];

    for (const rec of res.records) {
      const scv = rec.get('scv');
      const provFold = rec.get('prov');
      const consFold = rec.get('cons');
      if (!isGraphNode(scv)) continue;
      const provList = Array.isArray(provFold) ? provFold.filter(isGraphNode) : [];
      const consList = Array.isArray(consFold) ? consFold.filter(isGraphNode) : [];
      for (const prov of provList) {
        providerCvs.push(prov);
        outPairs.push(pairScvToProv(scv, prov));
      }
      for (const cons of consList) {
        consumerCvs.push(cons);
        inPairs.push(pairConsToScv(cons, scv));
      }
    }

    return {
      providerCvs: dedupeNodesByBusinessId(providerCvs),
      consumerCvs: dedupeNodesByBusinessId(consumerCvs),
      outPairs,
      inPairs,
    };
  }

  async #enrichFromAllCvs(
    cvIds: readonly string[],
    mode: ImpactQueryMode,
  ): Promise<{
    components: ImpactIdName[];
    teams: ImpactIdName[];
    features: ImpactIdName[];
    services: ImpactIdName[];
    applications: ImpactIdName[];
    units: ImpactIdName[];
  }> {
    if (cvIds.length === 0) {
      return {
        components: [],
        teams: [],
        features: [],
        services: [],
        applications: [],
        units: [],
      };
    }

    const cvSeed = `MATCH (cv:ComponentVersion) WHERE cv.id IN $ids`;
    const fvWhere = whereClause(fvStatusConditions(mode));
    const serviceWhere = whereClause([
      ...fvStatusConditions(mode),
      ...aggregatesActiveConditions(mode),
      ...serviceOperationalConditions(mode),
    ]);
    const avWhere = whereClause(avStatusConditions(mode));

    const query = `${cvSeed}
      MATCH (comp:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      RETURN DISTINCT 'component' AS t, comp.id AS id, comp.name AS name
      UNION
      ${cvSeed}
      MATCH (team:Team)-[:MAINTAINS]->(:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      RETURN DISTINCT 'team' AS t, team.id AS id, team.name AS name
      UNION
      ${cvSeed}
      MATCH (feat:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)
      ${fvWhere}
      RETURN DISTINCT 'feature' AS t, feat.id AS id, feat.name AS name
      UNION
      ${cvSeed}
      MATCH (svc:Service)-[agg:AGGREGATES]->(:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)
      ${serviceWhere}
      RETURN DISTINCT 'service' AS t, svc.id AS id, svc.name AS name
      UNION
      ${cvSeed}
      MATCH (tn:Unit)-[:PROVIDES]->(svc:Service)-[agg:AGGREGATES]->(:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)
      ${serviceWhere}
      RETURN DISTINCT 'unit' AS t, tn.id AS id, tn.name AS name
      UNION
      ${cvSeed}
      MATCH (tn:Unit)-[:STAKEHOLDER]->(:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)
      ${fvWhere}
      RETURN DISTINCT 'unit' AS t, tn.id AS id, tn.name AS name
      UNION
      ${cvSeed}
      MATCH (app:Application)-[:HAS_VERSION]->(av:ApplicationVersion)-[:HAS_COMPONENT]->(cv)
      ${avWhere}
      RETURN DISTINCT 'application' AS t, app.id AS id, app.name AS name
      UNION
      ${cvSeed}
      MATCH (tn:Unit)-[:OWNS]->(:Application)-[:HAS_VERSION]->(av:ApplicationVersion)-[:HAS_COMPONENT]->(cv)
      ${avWhere}
      RETURN DISTINCT 'unit' AS t, tn.id AS id, tn.name AS name`;

    const res = await this.neo4jService.read(query, { ids: cvIds });
    const byKind = {
      component: new Map<string, ImpactIdName>(),
      team: new Map<string, ImpactIdName>(),
      feature: new Map<string, ImpactIdName>(),
      service: new Map<string, ImpactIdName>(),
      application: new Map<string, ImpactIdName>(),
      unit: new Map<string, ImpactIdName>(),
    };

    for (const rec of res.records) {
      const t = rec.get('t');
      const idRaw = rec.get('id');
      const nameRaw = rec.get('name');
      if (typeof idRaw !== 'string' || idRaw.length === 0) continue;
      const row: ImpactIdName = { id: idRaw, name: typeof nameRaw === 'string' ? nameRaw : idRaw };
      if (t === 'component') byKind.component.set(idRaw, row);
      else if (t === 'team') byKind.team.set(idRaw, row);
      else if (t === 'feature') byKind.feature.set(idRaw, row);
      else if (t === 'service') byKind.service.set(idRaw, row);
      else if (t === 'application') byKind.application.set(idRaw, row);
      else if (t === 'unit') byKind.unit.set(idRaw, row);
    }

    return {
      components: [...byKind.component.values()],
      teams: [...byKind.team.values()],
      features: [...byKind.feature.values()],
      services: [...byKind.service.values()],
      applications: [...byKind.application.values()],
      units: [...byKind.unit.values()],
    };
  }

  async #readServiceStatus(serviceId: string): Promise<string | null> {
    const row = await this.neo4jService.read(
      `MATCH (svc:Service {id: $id}) RETURN svc.status AS value LIMIT 1`,
      { id: serviceId },
    );
    const status = row.records[0]?.get('value');
    return typeof status === 'string' ? status : null;
  }

  async #applicationsDetail(
    cvIds: readonly string[],
    mode: ImpactQueryMode,
  ): Promise<ImpactApplicationDetail[]> {
    if (cvIds.length === 0) return [];
    const avFilter = mode === GraphProjection.OnProd ? `AND av.status = 'current'` : '';
    const query = `
      UNWIND $ids AS cvId
      MATCH (cv:ComponentVersion {id: cvId})
      MATCH (app:Application)-[:HAS_VERSION]->(av:ApplicationVersion)-[hc:HAS_COMPONENT]->(cv)
      WHERE true ${avFilter}
      OPTIONAL MATCH (fv:FeatureVersion)-[uses:USES_COMPONENT_VERSION]->(cv)
        WHERE uses.applicationId = app.id
      OPTIONAL MATCH (feat:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)
      OPTIONAL MATCH (svc:Service)-[agg:AGGREGATES]->(feat)
        WHERE coalesce(agg.deleted, false) = false
      RETURN app.id AS applicationId, app.name AS applicationName, hc.status AS status,
        collect(DISTINCT CASE WHEN feat IS NOT NULL THEN {id: feat.id, name: feat.name} END) AS features,
        collect(DISTINCT CASE WHEN svc IS NOT NULL THEN {id: svc.id, name: svc.name} END) AS services
    `;
    const result = await this.neo4jService.read(query, { ids: cvIds });
    const byApp = new Map<string, ImpactApplicationDetail>();
    for (const record of result.records) {
      const applicationId = String(record.get('applicationId') ?? '');
      if (!applicationId) continue;
      const applicationName = String(record.get('applicationName') ?? applicationId);
      const status = parseVersionStatus(record.get('status')) ?? undefined;
      const featuresRaw = record.get('features');
      const servicesRaw = record.get('services');
      const features = Array.isArray(featuresRaw)
        ? featuresRaw
            .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
            .map((x) => ({ id: String(x.id ?? ''), name: String(x.name ?? '') }))
            .filter((x) => x.id.length > 0)
        : [];
      const services = Array.isArray(servicesRaw)
        ? servicesRaw
            .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
            .map((x) => ({ id: String(x.id ?? ''), name: String(x.name ?? '') }))
            .filter((x) => x.id.length > 0)
        : [];
      const existing = byApp.get(applicationId);
      if (!existing) {
        byApp.set(applicationId, {
          application: { id: applicationId, name: applicationName },
          ...(status !== undefined ? { status } : {}),
          features,
          services,
        });
        continue;
      }
      const featureMap = new Map(existing.features.map((f) => [f.id, f]));
      for (const feature of features) featureMap.set(feature.id, feature);
      const serviceMap = new Map(existing.services.map((s) => [s.id, s]));
      for (const service of services) serviceMap.set(service.id, service);
      byApp.set(applicationId, {
        ...existing,
        features: [...featureMap.values()],
        services: [...serviceMap.values()],
      });
    }
    return [...byApp.values()];
  }
}
