import { BadRequestException, Injectable } from '@nestjs/common';
import type { ArchitectureGraph, Node } from '@stellode/models';
import { Neo4jService, type GraphQueryResult } from '../neo4j/neo4j.service';
import { mergeStarCrossUnitBridges } from './models/cross-unit-diagram';
import { DIAGRAM_LAYER_ORDERS, orientGraphByLayerOrder } from './models/diagram-layout';
import {
  graphQueryResultToArchitectureGraph,
  mergeGraphDiagramResults,
} from './models/graph-to-architecture-graph';
import { mergeArchitectureGraphs } from './models/merge-architecture-graph';
import { excludeArchivedServicesOnProd } from './models/exclude-archived-services-on-prod';

const emptyResult = (): GraphQueryResult => ({ records: [] });

const foldResults = (parts: GraphQueryResult[]): GraphQueryResult =>
  parts.reduce((a, q) => mergeGraphDiagramResults(a, q), emptyResult());

const fetchErrorMessage = 'Error fetching data from graph database';

const rel = (alias: string): string =>
  `{id: ${alias}.id, from: startNode(${alias}).id, to: endNode(${alias}).id, label: type(${alias}), properties: properties(${alias})}`;

const activeAggregates = (alias: string): string =>
  `(${alias}.deleted IS NULL OR ${alias}.deleted = false)`;

@Injectable()
export class DiagramService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async getCrossUnitBridgeDiagram(
    unitIdA: string,
    unitIdB: string,
  ): Promise<ArchitectureGraph | { message: string }> {
    const unitIds = [unitIdA, unitIdB];
    try {
      const meta = await this.neo4jService.read(
        `MATCH (c:ComponentVersion)-[:DEPENDS_ON]->(p:ComponentVersion)
        WHERE c.unitId IN $unitIds AND p.unitId IN $unitIds
        RETURN c.unitId AS ct, p.unitId AS pt, coalesce(p.isPublic, false) AS pub`,
        { unitIds },
      );
      const ok = meta.records.filter((rec) => {
        const consumerUnit = `${rec.get('ct') ?? ''}`;
        const providerUnit = `${rec.get('pt') ?? ''}`;
        const isPublic = Boolean(rec.get('pub'));
        const unitSet = new Set([unitIdA, unitIdB]);
        return (
          consumerUnit !== providerUnit &&
          unitSet.has(consumerUnit) &&
          unitSet.has(providerUnit) &&
          isPublic
        );
      });
      if (ok.length === 0) {
        const g = graphQueryResultToArchitectureGraph(emptyResult());
        return orientGraphByLayerOrder(g, DIAGRAM_LAYER_ORDERS.unit);
      }
      const bridgeMatch = `MATCH (c:ComponentVersion)-[r:DEPENDS_ON]->(p:ComponentVersion)
        WHERE c.unitId IN $unitIds AND p.unitId IN $unitIds
          AND c.unitId <> p.unitId AND coalesce(p.isPublic, false) = true`;
      const edgePart = await this.neo4jService.read(
        `${bridgeMatch}
        RETURN c AS node, ${rel('r')} AS relationship
        UNION ALL
        ${bridgeMatch}
        RETURN p AS node, null AS relationship`,
        { unitIds },
      );
      const graphCore = graphQueryResultToArchitectureGraph(edgePart);
      const ids = [...new Set(graphCore.nodes.map((n) => n.id))];
      if (ids.length === 0) return orientGraphByLayerOrder(graphCore, DIAGRAM_LAYER_ORDERS.unit);
      const expanded = await this.#diagramContextAroundComponentVersions(ids);
      const merged = mergeArchitectureGraphs(graphCore, graphQueryResultToArchitectureGraph(expanded));
      return orientGraphByLayerOrder(
        excludeArchivedServicesOnProd(merged),
        DIAGRAM_LAYER_ORDERS.unit,
      );
    } catch (error) {
      console.error('Error fetching cross-unit bridge diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async getCrossUnitDiagram(centerUnitId: string): Promise<
    ArchitectureGraph | { message: string }
  > {
    try {
      const centerExist = await this.neo4jService.read(
        `MATCH (t:Unit {id: $id}) RETURN t LIMIT 1`,
        { id: centerUnitId },
      );
      if (centerExist.records.length === 0) {
        throw new BadRequestException(`Unit not found: ${centerUnitId}`);
      }
      const peerMeta = await this.neo4jService.read(
        `MATCH (c:ComponentVersion)-[:DEPENDS_ON]->(p:ComponentVersion)
        RETURN c.unitId AS ct, p.unitId AS pt, coalesce(p.isPublic, false) AS pub`,
      );
      const peerIds = [...new Set(
        peerMeta.records.flatMap((rec) => {
          const consumerUnit = `${rec.get('ct') ?? ''}`;
          const providerUnit = `${rec.get('pt') ?? ''}`;
          const isPublic = Boolean(rec.get('pub'));
          if (consumerUnit === providerUnit || !isPublic) return [];
          if (consumerUnit === centerUnitId) return [providerUnit];
          if (providerUnit === centerUnitId) return [consumerUnit];
          return [];
        }),
      )].filter((id) => id.length > 0);
      const unitsRes = await this.neo4jService.read(
        `MATCH (t:Unit) WHERE t.id IN $unitIds RETURN t AS node, null AS relationship`,
        { unitIds: [centerUnitId, ...peerIds] },
      );
      const base = graphQueryResultToArchitectureGraph(unitsRes);
      return orientGraphByLayerOrder(
        mergeStarCrossUnitBridges(base, centerUnitId, peerIds),
        DIAGRAM_LAYER_ORDERS.crossUnit,
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error fetching cross-unit diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async getUnitDiagram(unitId: string): Promise<ArchitectureGraph | { message: string }> {
    const params = { id: unitId };
    const unitOwnedCurrentAv = `MATCH (t:Unit {id: $id})-[:HAS_TEAM]-(tm:Team)-[:MAINTAINS]-(c:Component)
      -[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
      WHERE cv.status IN ['active', 'deprecated']
      MATCH (t)-[:OWNS]->(appRoot:Application)-[:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})
      MATCH (av)-[hc:HAS_COMPONENT]->(cv)
      WHERE hc.status IN ['active', 'deprecated']`;
    const unitHubFeature = `MATCH (t:Unit {id: $id})-[:PROVIDES]-(svc:Service)-[ag:AGGREGATES]->(feat:Feature)
      WHERE ${activeAggregates('ag')}`;
    const unitHubFeatureUses = `${unitHubFeature}
      MATCH (feat)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)
      WHERE fv.status IN ['draft', 'active', 'deprecated']
      MATCH (fv)-[uses:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      WHERE cv.status IN ['active', 'deprecated']
      MATCH (t)-[:HAS_TEAM]-(tm:Team)-[:MAINTAINS]-(c:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      MATCH (t)-[:OWNS]->(:Application)-[:HAS_VERSION]->(:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)
      WHERE hc.status IN ['active', 'deprecated']`;
    try {
      const ex = await this.neo4jService.read(
        `MATCH (t:Unit {id: $id}) RETURN t LIMIT 1`,
        params,
      );
      if (ex.records.length === 0) throw new BadRequestException(`Unit not found: ${unitId}`);
      const parts = await Promise.all([
        this.neo4jService.read(
          `MATCH (t:Unit {id: $id}) RETURN t AS node, null AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `MATCH (t:Unit {id: $id})-[r:HAS_TEAM]-(o) RETURN o AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitOwnedCurrentAv}
          MATCH (tm)-[r:MAINTAINS]-(c)
          RETURN c AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `MATCH (t:Unit {id: $id})-[r:PROVIDES]-(o) RETURN o AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `MATCH (t:Unit {id: $id})-[:PROVIDES]-(svc:Service)-[ag:AGGREGATES]->(feat:Feature)
          WHERE ${activeAggregates('ag')}
          RETURN feat AS node, ${rel('ag')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitOwnedCurrentAv}
          MATCH (t)-[r:OWNS]->(appRoot)
          RETURN appRoot AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitHubFeature}
          MATCH (feat)-[hv:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)
          WHERE fv.status IN ['draft', 'active', 'deprecated']
          RETURN fv AS node, ${rel('hv')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitHubFeatureUses}
          RETURN null AS node, ${rel('uses')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitOwnedCurrentAv}
          MATCH (c)-[r:HAS_VERSION|HAS_DRAFT]->(cv)
          RETURN cv AS node, ${rel('r')} AS relationship
          UNION ALL
          ${unitHubFeatureUses}
          MATCH (c)-[r:HAS_VERSION|HAS_DRAFT]->(cv)
          RETURN cv AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitOwnedCurrentAv}
          RETURN null AS node, ${rel('hc')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitOwnedCurrentAv}
          RETURN av AS node, null AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${unitOwnedCurrentAv}
          MATCH (appRoot)-[ar:HAS_VERSION]->(av)
          RETURN null AS node, ${rel('ar')} AS relationship
          UNION ALL
          ${unitOwnedCurrentAv}
          MATCH (appRoot:Application)-[ar:HAS_VERSION]->(av)
          RETURN appRoot AS node, null AS relationship`,
          params,
        ),
      ]);
      return orientGraphByLayerOrder(
        excludeArchivedServicesOnProd(graphQueryResultToArchitectureGraph(foldResults(parts))),
        DIAGRAM_LAYER_ORDERS.unit,
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error fetching unit diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async getTeamDiagram(teamId: string): Promise<ArchitectureGraph | { message: string }> {
    const params = { id: teamId };
    const teamCvMatch = `MATCH (tm:Team {id: $id})-[:MAINTAINS]-(c:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
      WHERE cv.status IN ['active', 'deprecated']`;
    const teamFeatureMatch = `${teamCvMatch}
      MATCH (fv:FeatureVersion {status: 'active'})-[:USES_COMPONENT_VERSION]->(cv)
      MATCH (feat:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)`;
    const teamAvMatch = `${teamCvMatch}
      MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)`;
    try {
      await this.#assertTeamExists(teamId);
      const parts = await Promise.all([
        this.neo4jService.read(
          `MATCH (tm:Team {id: $id}) RETURN tm AS node, null AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `MATCH (tm:Team {id: $id})-[r:MAINTAINS]-(o) RETURN o AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `MATCH (tm:Team {id: $id})-[:MAINTAINS]-(c:Component)-[r:HAS_VERSION|HAS_DRAFT]->(cv:ComponentVersion)
          WHERE cv.status IN ['active', 'deprecated']
          RETURN cv AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${teamCvMatch}
          MATCH (u:FeatureVersion {status: 'active'})-[r:USES_COMPONENT_VERSION]->(cv)
          RETURN u AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${teamCvMatch}
          MATCH (fv:FeatureVersion {status: 'active'})-[:USES_COMPONENT_VERSION]->(cv)
          MATCH (f)-[r:HAS_VERSION|HAS_DRAFT]->(fv)
          RETURN f AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${teamFeatureMatch}
          RETURN DISTINCT feat AS node, null AS relationship
          UNION ALL
          ${teamFeatureMatch}
          MATCH (svc)-[ag:AGGREGATES]->(feat) WHERE ${activeAggregates('ag')}
          RETURN svc AS node, ${rel('ag')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${teamAvMatch}
          RETURN null AS node, ${rel('hc')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${teamAvMatch}
          RETURN av AS node, null AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${teamAvMatch}
          MATCH (appRoot)-[ar:HAS_VERSION]->(av)
          RETURN av AS node, null AS relationship
          UNION ALL
          ${teamAvMatch}
          MATCH (appRoot)-[ar:HAS_VERSION]->(av)
          RETURN null AS node, ${rel('ar')} AS relationship
          UNION ALL
          ${teamAvMatch}
          MATCH (appRoot:Application)-[ar:HAS_VERSION]->(av)
          RETURN appRoot AS node, null AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${teamCvMatch}
          WITH collect(DISTINCT cv.id) AS ids
          MATCH (a:ComponentVersion)-[r:DEPENDS_ON]->(b:ComponentVersion)
          WHERE a.id IN ids AND b.id IN ids
          RETURN null AS node, ${rel('r')} AS relationship`,
          params,
        ),
      ]);
      return orientGraphByLayerOrder(
        excludeArchivedServicesOnProd(graphQueryResultToArchitectureGraph(foldResults(parts))),
        DIAGRAM_LAYER_ORDERS.team,
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error fetching team diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async getFeatureVersionDiagram(id: string): Promise<ArchitectureGraph | { message: string }> {
    try {
      const fvExist = await this.neo4jService.read(
        `MATCH (fv:FeatureVersion {id: $id}) RETURN fv LIMIT 1`,
        { id },
      );
      if (fvExist.records.length === 0) {
        throw new BadRequestException(`FeatureVersion not found: ${id}`);
      }
      const featureElementId = await this.#resolveParentFeatureElementId(id);
      if (!featureElementId) {
        throw new BadRequestException(`FeatureVersion has no parent Feature: ${id}`);
      }
      return await this.#architectureGraphForFeatureAndVersion(featureElementId, id);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error fetching feature-version diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async getServiceDiagram(
    serviceId: string,
    projection: 'on-prod' | 'draft' = 'on-prod',
  ): Promise<ArchitectureGraph | { message: string }> {
    const params = { id: serviceId, includeDeleted: projection === 'draft' };
    const aggCondition = `($includeDeleted OR ${activeAggregates('ag')})`;
    const serviceFeatureMatch = `MATCH (s:Service {id: $id})-[ag:AGGREGATES]->(f:Feature)
      WHERE ${aggCondition}`;
    const serviceCvMatch = `${serviceFeatureMatch}
      MATCH (f)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)
      MATCH (fv)-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      WHERE cv.status IN ['active', 'deprecated']`;
    const serviceAvMatch = `${serviceCvMatch}
      MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)`;
    const providesMatch = `MATCH (t:Unit)-[pe:PROVIDES]->(s:Service {id: $id})`;
    try {
      const ex = await this.neo4jService.read(
        `MATCH (:Unit)-[:PROVIDES]->(s:Service {id: $id}) RETURN s LIMIT 1`,
        { id: serviceId },
      );
      if (ex.records.length === 0) throw new BadRequestException(`Service not found: ${serviceId}`);
      const parts = await Promise.all([
        this.neo4jService.read(
          `${providesMatch} RETURN t AS node, null AS relationship
          UNION ALL
          ${providesMatch} RETURN s AS node, null AS relationship
          UNION ALL
          ${providesMatch} RETURN null AS node, ${rel('pe')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceFeatureMatch} RETURN f AS node, null AS relationship
          UNION ALL
          ${serviceFeatureMatch} RETURN null AS node, ${rel('ag')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceFeatureMatch}
          MATCH (f)-[r:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion {status: 'active'})
          RETURN fv AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceFeatureMatch}
          MATCH (f)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion {status: 'active'})
          MATCH (fv)-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
          WHERE cv.status IN ['active', 'deprecated']
          MATCH (co:Component)-[r:HAS_VERSION|HAS_DRAFT]->(cv)
          RETURN co AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceCvMatch}
          MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
          RETURN co AS node, null AS relationship
          UNION ALL
          ${serviceCvMatch}
          MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
          MATCH (m)-[r:MAINTAINS]->(co)
          RETURN m AS node, ${rel('r')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceCvMatch}
          MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
          MATCH (tt:Unit)-[ht:HAS_TEAM]->(team:Team)-[:MAINTAINS]->(co)
          RETURN team AS node, null AS relationship
          UNION ALL
          ${serviceCvMatch}
          MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
          MATCH (tt:Unit)-[ht:HAS_TEAM]->(team:Team)-[:MAINTAINS]->(co)
          RETURN tt AS node, null AS relationship
          UNION ALL
          ${serviceCvMatch}
          MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
          MATCH (tt:Unit)-[ht:HAS_TEAM]->(team:Team)-[:MAINTAINS]->(co)
          RETURN null AS node, ${rel('ht')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceAvMatch}
          RETURN null AS node, ${rel('hc')} AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceAvMatch}
          RETURN av AS node, null AS relationship`,
          params,
        ),
        this.neo4jService.read(
          `${serviceAvMatch}
          MATCH (appRoot)-[ar:HAS_VERSION]->(av)
          RETURN av AS node, null AS relationship
          UNION ALL
          ${serviceAvMatch}
          MATCH (appRoot)-[ar:HAS_VERSION]->(av)
          RETURN null AS node, ${rel('ar')} AS relationship
          UNION ALL
          ${serviceAvMatch}
          MATCH (appRoot:Application)-[ar:HAS_VERSION]->(av)
          RETURN appRoot AS node, null AS relationship`,
          params,
        ),
      ]);
      return orientGraphByLayerOrder(
        graphQueryResultToArchitectureGraph(foldResults(parts)),
        DIAGRAM_LAYER_ORDERS.service,
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error fetching service diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async getServiceIntegrationsDiagram(
    serviceId: string,
    projection: 'on-prod' | 'draft' = 'on-prod',
  ): Promise<ArchitectureGraph | { message: string }> {
    const base = await this.getServiceDiagram(serviceId, projection);
    if (!('nodes' in base)) return base;
    const cvIds = [
      ...new Set(
        base.nodes
          .filter((n: Node) => n.labels.includes('ComponentVersion'))
          .map((n: Node) => n.id),
      ),
    ];
    if (cvIds.length === 0) return base;
    try {
      const extra = foldResults([
        await this.#dependsOnForCvSet(cvIds),
        await this.#diagramContextAroundComponentVersions(cvIds),
      ]);
      const merged = mergeArchitectureGraphs(base, graphQueryResultToArchitectureGraph(extra));
      const graph =
        projection === 'on-prod'
          ? excludeArchivedServicesOnProd(merged, { retainServiceIds: [serviceId] })
          : merged;
      return orientGraphByLayerOrder(graph, DIAGRAM_LAYER_ORDERS.service);
    } catch (error) {
      console.error('Error fetching service integrations diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async #architectureGraphForFeatureAndVersion(
    featureElementId: string,
    fvId: string,
  ): Promise<ArchitectureGraph> {
    const fvStatus =
      (await this.#readScalar(
        `MATCH (fv:FeatureVersion {id: $id}) RETURN fv.status AS value LIMIT 1`,
        { id: fvId },
      )) ?? '';
    const usePublishedLineCvFilter = fvStatus === 'active';
    const cvUsesWhere = usePublishedLineCvFilter
      ? `WHERE cv.status IN ['active', 'deprecated']`
      : '';
    const unitIds = await this.#featureDiagramUnitIds(featureElementId);
    const applicationOwnerFilter =
      unitIds.length > 0
        ? ` WHERE EXISTS { MATCH (ownUnit:Unit)-[:OWNS]->(appRoot) WHERE ownUnit.id IN $unitIds }`
        : '';
    const params = { featureId: featureElementId, fvId, unitIds };
    const featureAggregatesMatch = `MATCH (svc:Service)-[ag:AGGREGATES]->(f:Feature {id: $featureId})
      WHERE ${activeAggregates('ag')}`;
    const isDraftFeatureVersion = fvStatus === 'draft';
    const fvCvMatch = `MATCH (fv:FeatureVersion {id: $fvId})-[:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      ${cvUsesWhere}`;
    const fvAvMatch = isDraftFeatureVersion
      ? `${fvCvMatch}
      MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)`
      : `${fvCvMatch}
      MATCH (fv)-[:PINNED_TO_APPLICATION_VERSION]->(av:ApplicationVersion)-[hc:HAS_COMPONENT]->(cv)`;
    const fvUsesAppMatch = `MATCH (fv:FeatureVersion {id: $fvId})-[u:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      ${cvUsesWhere}
      WITH fv, cv, u.applicationId AS appId
      WHERE appId IS NOT NULL AND appId <> ''
      MATCH (appRoot:Application {id: appId})`;
    const fvUsesAppVersionMatch = isDraftFeatureVersion
      ? `${fvUsesAppMatch}
      MATCH (appRoot)-[ar:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})`
      : `${fvUsesAppMatch}
      MATCH (fv)-[:PINNED_TO_APPLICATION_VERSION]->(av:ApplicationVersion)<-[ar:HAS_VERSION]-(appRoot)`;
    const parts = await Promise.all([
      this.neo4jService.read(
        `MATCH (f:Feature {id: $featureId}) RETURN f AS node, null AS relationship
        UNION ALL
        MATCH (f:Feature {id: $featureId})-[r:HAS_VERSION|HAS_DRAFT]->(fv {id: $fvId})
        RETURN fv AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `MATCH (t)-[r:STAKEHOLDER]->(f:Feature {id: $featureId})
        RETURN t AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${featureAggregatesMatch} RETURN svc AS node, null AS relationship
        UNION ALL
        ${featureAggregatesMatch} RETURN null AS node, ${rel('ag')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${featureAggregatesMatch}
        MATCH (t:Unit)-[pe:PROVIDES]->(svc)
        RETURN t AS node, null AS relationship
        UNION ALL
        ${featureAggregatesMatch}
        MATCH (t:Unit)-[pe:PROVIDES]->(svc)
        RETURN null AS node, ${rel('pe')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `MATCH (fv:FeatureVersion {id: $fvId})-[r:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
        ${cvUsesWhere}
        RETURN cv AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${fvCvMatch}
        MATCH (co:Component)-[r:HAS_VERSION|HAS_DRAFT]->(cv)
        RETURN co AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${fvCvMatch}
        MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
        RETURN co AS node, null AS relationship
        UNION ALL
        ${fvCvMatch}
        MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
        MATCH (m)-[r:MAINTAINS]->(co)
        RETURN m AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${fvCvMatch}
        MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
        MATCH (tt:Unit)-[ht:HAS_TEAM]->(team:Team)-[:MAINTAINS]->(co)
        RETURN team AS node, null AS relationship
        UNION ALL
        ${fvCvMatch}
        MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
        MATCH (tt:Unit)-[ht:HAS_TEAM]->(team:Team)-[:MAINTAINS]->(co)
        RETURN tt AS node, null AS relationship
        UNION ALL
        ${fvCvMatch}
        MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
        MATCH (tt:Unit)-[ht:HAS_TEAM]->(team:Team)-[:MAINTAINS]->(co)
        RETURN null AS node, ${rel('ht')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${fvAvMatch}
        RETURN null AS node, ${rel('hc')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${fvAvMatch}
        MATCH (appRoot:Application)-[ar:HAS_VERSION]->(av)${applicationOwnerFilter}
        RETURN av AS node, ${rel('ar')} AS relationship
        UNION ALL
        ${fvAvMatch}
        MATCH (appRoot:Application)-[ar:HAS_VERSION]->(av)${applicationOwnerFilter}
        RETURN appRoot AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${fvUsesAppMatch}
        RETURN appRoot AS node, null AS relationship
        UNION ALL
        ${fvUsesAppVersionMatch}
        RETURN av AS node, ${rel('ar')} AS relationship
        UNION ALL
        ${fvUsesAppVersionMatch}
        MATCH (av)-[hc:HAS_COMPONENT]->(cv)
        RETURN null AS node, ${rel('hc')} AS relationship`,
        params,
      ),
    ]);
    let graph = graphQueryResultToArchitectureGraph(foldResults(parts));
    const hasActiveAggregateToFeature = graph.relationships.some(
      (r) =>
        r.type === 'AGGREGATES' &&
        r.to === featureElementId &&
        (r.properties === undefined || r.properties?.deleted !== true),
    );
    if (hasActiveAggregateToFeature) {
      graph = {
        nodes: graph.nodes,
        relationships: graph.relationships.filter(
          (r) => !(r.type === 'STAKEHOLDER' && r.to === featureElementId),
        ),
      };
    }
    const cvIds = [
      ...new Set(
        graph.nodes.filter((n) => n.labels.includes('ComponentVersion')).map((n) => n.id),
      ),
    ];
    if (cvIds.length > 0) {
      const depsResult = await this.#dependsOnForFeatureVersion(cvIds, fvId);
      const depsGraph = graphQueryResultToArchitectureGraph(depsResult);
      graph = mergeArchitectureGraphs(graph, depsGraph);
      const expandedCvIds = [
        ...new Set([
          ...cvIds,
          ...depsGraph.nodes
            .filter((node) => node.labels.includes('ComponentVersion'))
            .map((node) => node.id),
        ]),
      ];
      const usePinnedApplicationVersions = !isDraftFeatureVersion;
      const context = foldResults([
        await this.#diagramContextAroundComponentVersions(expandedCvIds, {
          featureVersionId: fvId,
          usePinnedApplicationVersions,
        }),
        await this.#providerApplicationsForFeatureDependsOn(cvIds, fvId, {
          usePinnedApplicationVersions,
        }),
      ]);
      graph = mergeArchitectureGraphs(graph, graphQueryResultToArchitectureGraph(context));
    }
    return orientGraphByLayerOrder(
      excludeArchivedServicesOnProd(graph),
      DIAGRAM_LAYER_ORDERS.feature,
    );
  }

  async getComponentDiagram(id: string): Promise<ArchitectureGraph | { message: string }> {
    try {
      const componentExist = await this.neo4jService.read(
        `MATCH (co:Component {id: $id}) RETURN co LIMIT 1`,
        { id },
      );
      if (componentExist.records.length === 0) {
        throw new BadRequestException(`Component not found: ${id}`);
      }
      const baseParts = await Promise.all([
        this.neo4jService.read(
          `MATCH (co:Component {id: $id}) RETURN co AS node, null AS relationship`,
          { id },
        ),
        this.neo4jService.read(
          `MATCH (m)-[r:MAINTAINS]->(co:Component {id: $id})
          RETURN m AS node, ${rel('r')} AS relationship`,
          { id },
        ),
        this.neo4jService.read(
          `MATCH (co:Component {id: $id})-[r:HAS_DRAFT]->(v)
          RETURN v AS node, ${rel('r')} AS relationship`,
          { id },
        ),
        this.neo4jService.read(
          `MATCH (co:Component {id: $id})-[r:HAS_VERSION]->(v)
          RETURN v AS node, ${rel('r')} AS relationship`,
          { id },
        ),
      ]);
      const baseGraphAll = graphQueryResultToArchitectureGraph(foldResults(baseParts));
      const componentNode = baseGraphAll.nodes.find((node) => node.labels.includes('Component'));
      const teamNodes = baseGraphAll.relationships
        .filter((relationship) => relationship.type === 'MAINTAINS' && relationship.to === id)
        .map((relationship) => relationship.from);
      const draftVersionIds = baseGraphAll.relationships
        .filter((relationship) => relationship.type === 'HAS_DRAFT' && relationship.from === id)
        .map((relationship) => relationship.to);
      const latestVersion = baseGraphAll.relationships
        .filter((relationship) => relationship.type === 'HAS_VERSION' && relationship.from === id)
        .map((relationship) => ({
          relationship,
          node: baseGraphAll.nodes.find((node) => node.id === relationship.to),
        }))
        .filter(
          (item): item is { relationship: ArchitectureGraph['relationships'][number]; node: Node } =>
            item.node !== undefined,
        )
        .sort((left, right) => (right.node.versionNumber ?? -1) - (left.node.versionNumber ?? -1))[0];
      const keepNodeIds = new Set<string>([
        ...(componentNode ? [componentNode.id] : []),
        ...teamNodes,
        ...draftVersionIds,
        ...(latestVersion ? [latestVersion.node.id] : []),
      ]);
      const keepRelationshipIds = new Set<string>([
        ...baseGraphAll.relationships
          .filter((relationship) => relationship.type === 'MAINTAINS' && relationship.to === id)
          .map((relationship) => relationship.id),
        ...baseGraphAll.relationships
          .filter((relationship) => relationship.type === 'HAS_DRAFT' && relationship.from === id)
          .map((relationship) => relationship.id),
        ...(latestVersion ? [latestVersion.relationship.id] : []),
      ]);
      const baseGraph: ArchitectureGraph = {
        nodes: baseGraphAll.nodes.filter((node) => keepNodeIds.has(node.id)),
        relationships: baseGraphAll.relationships.filter((relationship) =>
          keepRelationshipIds.has(relationship.id),
        ),
      };
      const cvIds = [
        ...new Set(
          baseGraph.nodes.filter((node) => node.labels.includes('ComponentVersion')).map((node) => node.id),
        ),
      ];
      if (cvIds.length === 0) {
        return orientGraphByLayerOrder(baseGraph, DIAGRAM_LAYER_ORDERS.component);
      }
      const context = await this.#componentDiagramContextAroundVersions(cvIds);
      const graph = mergeArchitectureGraphs(baseGraph, graphQueryResultToArchitectureGraph(context));
      return orientGraphByLayerOrder(graph, DIAGRAM_LAYER_ORDERS.component);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Error fetching component diagram:', error);
      return { message: fetchErrorMessage };
    }
  }

  async #assertTeamExists(teamId: string): Promise<void> {
    const r = await this.neo4jService.read(
      `MATCH (:Unit)-[:HAS_TEAM]->(tm:Team {id: $id}) RETURN tm LIMIT 1`,
      { id: teamId },
    );
    if (r.records.length === 0) throw new BadRequestException(`Team not found: ${teamId}`);
  }

  async #readScalar(query: string, parameters: Record<string, unknown>): Promise<string | null> {
    const r = await this.neo4jService.read(query, parameters);
    const rec = r.records[0];
    if (!rec) return null;
    const v = rec.get('value') ?? rec.get('id');
    if (typeof v === 'string' && v.length > 0) return v;
    if (v === null || v === undefined) return null;
    const s = `${v}`;
    return s.length > 0 && s !== 'undefined' ? s : null;
  }

  async #resolveParentFeatureElementId(featureVersionId: string): Promise<string | null> {
    return this.#readScalar(
      `MATCH (f:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion {id: $id})
      RETURN f.id AS value LIMIT 1`,
      { id: featureVersionId },
    );
  }

  async #featureDiagramUnitIds(featureId: string): Promise<string[]> {
    const res = await this.neo4jService.read(
      `MATCH (t:Unit)-[:STAKEHOLDER]->(:Feature {id: $id})
      RETURN DISTINCT t.id AS tid
      UNION
      MATCH (t:Unit)-[:PROVIDES]->(:Service)-[ag:AGGREGATES]->(:Feature {id: $id})
      WHERE ${activeAggregates('ag')}
      RETURN DISTINCT t.id AS tid`,
      { id: featureId },
    );
    return [
      ...new Set(
        res.records.map((rec) => `${rec.get('tid') ?? ''}`).filter((s) => s.length > 0),
      ),
    ];
  }

  async #dependsOnForCvSet(cvIds: readonly string[]): Promise<GraphQueryResult> {
    const dependsMatch = `MATCH (a:ComponentVersion)-[r:DEPENDS_ON]->(b:ComponentVersion)
      WHERE (a.id IN $ids OR b.id IN $ids)
        AND (coalesce(a.unitId, '') = coalesce(b.unitId, '') OR b.isPublic = true)`;
    return this.neo4jService.read(
      `${dependsMatch}
      RETURN a AS node, ${rel('r')} AS relationship
      UNION ALL
      ${dependsMatch}
      RETURN b AS node, null AS relationship`,
      { ids: [...cvIds] },
    );
  }

  async #dependsOnForFeatureVersion(
    cvIds: readonly string[],
    featureVersionId: string,
  ): Promise<GraphQueryResult> {
    const dependsMatch = `MATCH (a:ComponentVersion)-[r:DEPENDS_ON]->(b:ComponentVersion)
      WHERE a.id IN $ids
        AND r.consumerFeatureVersionId = $featureVersionId
        AND (coalesce(a.unitId, '') = coalesce(b.unitId, '') OR b.isPublic = true)`;
    return this.neo4jService.read(
      `${dependsMatch}
      RETURN a AS node, ${rel('r')} AS relationship
      UNION ALL
      ${dependsMatch}
      RETURN b AS node, null AS relationship`,
      { ids: [...cvIds], featureVersionId },
    );
  }

  async #providerApplicationsForFeatureDependsOn(
    cvIds: readonly string[],
    featureVersionId: string,
    options: { readonly usePinnedApplicationVersions: boolean } = {
      usePinnedApplicationVersions: false,
    },
  ): Promise<GraphQueryResult> {
    const dependsMatch = `MATCH (a:ComponentVersion)-[r:DEPENDS_ON]->(b:ComponentVersion)
      WHERE a.id IN $ids
        AND r.consumerFeatureVersionId = $featureVersionId
        AND (coalesce(a.unitId, '') = coalesce(b.unitId, '') OR b.isPublic = true)
      WITH b, coalesce(r.providerApplicationId, '') AS appId
      WHERE appId <> ''
      MATCH (appRoot:Application {id: appId})`;
    const avJoin = options.usePinnedApplicationVersions
      ? `MATCH (fvPin:FeatureVersion {id: $featureVersionId})-[:PINNED_TO_APPLICATION_VERSION]->(av:ApplicationVersion)
      <-[ar:HAS_VERSION]-(appRoot)`
      : `MATCH (appRoot)-[ar:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})`;
    const hcJoin = options.usePinnedApplicationVersions
      ? `MATCH (fvPin:FeatureVersion {id: $featureVersionId})-[:PINNED_TO_APPLICATION_VERSION]->(av:ApplicationVersion)
      <-[:HAS_VERSION]-(appRoot)
      MATCH (av)-[hc:HAS_COMPONENT]->(b)`
      : `MATCH (appRoot)-[:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(b)`;
    return this.neo4jService.read(
      `${dependsMatch}
      RETURN appRoot AS node, null AS relationship
      UNION ALL
      ${dependsMatch}
      ${avJoin}
      RETURN av AS node, ${rel('ar')} AS relationship
      UNION ALL
      ${dependsMatch}
      ${hcJoin}
      RETURN null AS node, ${rel('hc')} AS relationship
      UNION ALL
      ${dependsMatch}
      MATCH (fv:FeatureVersion)-[u:USES_COMPONENT_VERSION]->(b)
      WHERE u.applicationId = appId
      RETURN null AS node, ${rel('u')} AS relationship`,
      { ids: [...cvIds], featureVersionId },
    );
  }

  async #componentDiagramContextAroundVersions(cvIds: readonly string[]): Promise<GraphQueryResult> {
    const params = { ids: [...cvIds] };
    const cvMatch = `MATCH (cv:ComponentVersion) WHERE cv.id IN $ids`;
    const fvMatch = `${cvMatch}
      MATCH (fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)`;
    const featureMatch = `${fvMatch}
      MATCH (f:Feature)-[fe:HAS_VERSION|HAS_DRAFT]->(fv)`;
    const aggMatch = `${featureMatch}
      MATCH (svc:Service)-[ag:AGGREGATES]->(f) WHERE ${activeAggregates('ag')}`;
    const avMatch = `${cvMatch}
      MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)`;
    const appMatch = `${avMatch}
      MATCH (appRoot:Application)-[ar:HAS_VERSION]->(av)`;
    const parts = await Promise.all([
      this.neo4jService.read(
        `${cvMatch}
        MATCH (u)-[r:USES_COMPONENT_VERSION]->(cv)
        RETURN u AS node, ${rel('r')} AS relationship
        UNION ALL
        ${cvMatch}
        MATCH (u)-[r:USES_COMPONENT_VERSION]->(cv)
        RETURN cv AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${featureMatch} RETURN fv AS node, null AS relationship
        UNION ALL
        ${featureMatch} RETURN null AS node, ${rel('fe')} AS relationship
        UNION ALL
        ${featureMatch} RETURN f AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${aggMatch} RETURN f AS node, null AS relationship
        UNION ALL
        ${aggMatch} RETURN svc AS node, null AS relationship
        UNION ALL
        ${aggMatch} RETURN null AS node, ${rel('ag')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${avMatch} RETURN av AS node, ${rel('hc')} AS relationship
        UNION ALL
        ${avMatch} RETURN cv AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${appMatch} RETURN appRoot AS node, ${rel('ar')} AS relationship
        UNION ALL
        ${appMatch} RETURN av AS node, null AS relationship`,
        params,
      ),
    ]);
    return foldResults(parts);
  }

  async #diagramContextAroundComponentVersions(
    cvIds: readonly string[],
    options: {
      readonly featureVersionId?: string;
      readonly usePinnedApplicationVersions?: boolean;
    } = {},
  ): Promise<GraphQueryResult> {
    const usePinned =
      options.usePinnedApplicationVersions === true &&
      typeof options.featureVersionId === 'string' &&
      options.featureVersionId.length > 0;
    const params = {
      ids: [...cvIds],
      ...(usePinned ? { featureVersionId: options.featureVersionId } : {}),
    };
    const cvMatch = `MATCH (cv:ComponentVersion) WHERE cv.id IN $ids`;
    const componentMatch = `${cvMatch}
      MATCH (co:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)`;
    const teamMatch = `${componentMatch}
      MATCH (tm:Team)-[:MAINTAINS]->(co)`;
    const featureMatch = `${cvMatch}
      MATCH (fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)
      MATCH (f:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)`;
    const serviceMatch = `${featureMatch}
      MATCH (svc:Service)-[agg:AGGREGATES]->(f) WHERE ${activeAggregates('agg')}`;
    const avMatch = usePinned
      ? `${cvMatch}
      MATCH (fvPin:FeatureVersion {id: $featureVersionId})-[:PINNED_TO_APPLICATION_VERSION]->(av:ApplicationVersion)
        -[hc:HAS_COMPONENT]->(cv)`
      : `${cvMatch}
      MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)`;
    const usesAppMatch = `${cvMatch}
      MATCH (fv:FeatureVersion)-[u:USES_COMPONENT_VERSION]->(cv)
      WHERE u.applicationId IS NOT NULL AND u.applicationId <> ''
      MATCH (appRoot:Application {id: u.applicationId})`;
    const usesAppVersionJoin = usePinned
      ? `MATCH (fvPin:FeatureVersion {id: $featureVersionId})-[:PINNED_TO_APPLICATION_VERSION]->(av:ApplicationVersion)
        <-[ar:HAS_VERSION]-(appRoot)`
      : `MATCH (appRoot)-[ar:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})`;
    const parts = await Promise.all([
      this.neo4jService.read(
        `${cvMatch} RETURN cv AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${usesAppMatch}
        RETURN appRoot AS node, null AS relationship
        UNION ALL
        ${usesAppMatch}
        ${usesAppVersionJoin}
        RETURN av AS node, ${rel('ar')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${cvMatch}
        MATCH (co:Component)-[r:HAS_VERSION|HAS_DRAFT]->(cv)
        RETURN co AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${componentMatch}
        MATCH (m)-[r:MAINTAINS]->(co)
        RETURN m AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${teamMatch}
        MATCH (x)-[r:HAS_TEAM]->(tm)
        RETURN null AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${teamMatch}
        MATCH (tt:Unit)-[:HAS_TEAM]->(tm)
        RETURN tt AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${cvMatch}
        MATCH (u)-[r:USES_COMPONENT_VERSION]->(cv)
        RETURN u AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${cvMatch}
        MATCH (fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)
        MATCH (f:Feature)-[r:HAS_VERSION|HAS_DRAFT]->(fv)
        RETURN f AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${featureMatch}
        MATCH (svc)-[ag:AGGREGATES]->(f) WHERE ${activeAggregates('ag')}
        RETURN svc AS node, ${rel('ag')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${serviceMatch}
        MATCH (t:Unit)-[pe:PROVIDES]->(svc)
        RETURN t AS node, ${rel('pe')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${avMatch}
        RETURN null AS node, ${rel('hc')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${avMatch}
        RETURN av AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${avMatch}
        MATCH (appRoot)-[ar:HAS_VERSION]->(av)
        RETURN av AS node, null AS relationship
        UNION ALL
        ${avMatch}
        MATCH (appRoot)-[ar:HAS_VERSION]->(av)
        RETURN null AS node, ${rel('ar')} AS relationship
        UNION ALL
        ${avMatch}
        MATCH (appRoot:Application)-[ar:HAS_VERSION]->(av)
        RETURN appRoot AS node, null AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${serviceMatch}
        MATCH (svc)-[r]->(app:Application)
        RETURN app AS node, null AS relationship
        UNION ALL
        ${serviceMatch}
        MATCH (svc)-[r]->(app:Application)
        RETURN null AS node, ${rel('r')} AS relationship`,
        params,
      ),
      this.neo4jService.read(
        `${serviceMatch}
        MATCH (app:Application)-[r]->(svc)
        RETURN app AS node, null AS relationship
        UNION ALL
        ${serviceMatch}
        MATCH (app:Application)-[r]->(svc)
        RETURN null AS node, ${rel('r')} AS relationship`,
        params,
      ),
    ]);
    return foldResults(parts);
  }
}
