import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  filterIdNames,
  requireGraphNode,
  toComponentVersionView,
} from '../common/graph-helpers';
import { resolveComponentOrFeatureVersionString } from '../common/parent-version-uniqueness';
import { resolveComponentOrVersionToVersionId } from '../common/resolve-component-or-version-to-version-id';
import {
  BlockingRelationDirection,
  parseBlockingRelations,
  throwDeletionBlocked,
} from '../common/version-delete';
import {
  allowedTargetsFeatureVersion,
  FeatureVersionReadinessReason,
  parseVersionStatus,
  VersionStatus,
  type VersionStatus as VersionStatusType,
} from '@stellode/models';
import {
  componentVersionStatusChangedEvent,
  type ComponentVersionStatusChangedPayload,
} from '../common/component-version-events';
import { ComponentVersionService } from '../component-version/component-version.service';
import { Neo4jService, type GraphNode, type Neo4jRun } from '../neo4j/neo4j.service';
import type {
  CheckFeatureVersionReadyResult,
  CreateFeatureVersionBodyDto,
  DependsOnContextDto,
  FeatureBindingReadiness,
  FeatureComponentVersionBinding,
  PublishFeatureVersionDto,
  RaiseFeatureComponentVersionDto,
  RaiseFeatureComponentVersionResult,
} from '@stellode/models';
import {
  assertPinsCoverApplications,
  type ApplicationVersionPin,
} from './assert-pins-cover-applications';
import {
  dependsOnContextProps,
  dependsOnContextsEqual,
  dependsOnMatchKeyParams,
  dependsOnMatchKeysWhere,
} from '../common/depends-on-context-props';
import { buildInheritedFeatureDependsOnContext } from './build-inherited-feature-depends-on-context';
import { buildRaisedDependsOnContext } from './build-raised-depends-on-context';
import { collectPinApplicationIds } from './collect-pin-application-ids';
import { draftReadyForProduction } from './draft-ready-for-production';
import { isRaiseDependsOnIncomingEdge } from './is-raise-depends-on-incoming-edge';
import { isRaiseDependsOnSourceEdge } from './is-raise-depends-on-source-edge';
import { parseDependsOnContext } from './parse-depends-on-context';
import {
  toFeatureBindingReadiness,
  type RawBindingReadinessRow,
} from './to-feature-binding-readiness';

const RAISE_TARGET_STATUSES = new Set<string>([
  VersionStatus.Draft,
  VersionStatus.Active,
  VersionStatus.Deprecated,
]);

const serializeFv = (node: GraphNode) => {
  const p = node.properties;
  const status = parseVersionStatus(p.status ?? p.state) ?? VersionStatus.Unactive;
  const rawCanAutoActive = p.canAutoActive;
  const canAutoActive = rawCanAutoActive === true || rawCanAutoActive === 'true';
  return { ...p, id: (p.id as string) ?? node.id, status, canAutoActive };
};

type FeatureVersionSortable = {
  readonly id: string;
  readonly status: VersionStatusType;
  readonly versionNumber?: string | number;
  readonly version?: string | number;
};

const featureVersionSortRank: Readonly<Record<VersionStatusType, number>> = {
  [VersionStatus.Draft]: 0,
  [VersionStatus.Active]: 1,
  [VersionStatus.Unactive]: 2,
  [VersionStatus.Deprecated]: 3,
};

const toFiniteNumber = (raw: string | number | undefined): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Number.NEGATIVE_INFINITY;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
  }
  return Number.NEGATIVE_INFINITY;
};

const compareFeatureVersions = <T extends FeatureVersionSortable>(left: T, right: T): number => {
  const rankDiff = featureVersionSortRank[left.status] - featureVersionSortRank[right.status];
  if (rankDiff !== 0) return rankDiff;

  const versionNumberDiff =
    toFiniteNumber(right.versionNumber) - toFiniteNumber(left.versionNumber);
  if (versionNumberDiff !== 0) return versionNumberDiff;

  const versionDiff =
    toFiniteNumber(right.version) - toFiniteNumber(left.version);
  if (versionDiff !== 0) return versionDiff;

  return right.id.localeCompare(left.id);
};

const collectedStrings = (records: ReadonlyArray<{ get(key: string): unknown }>): string[] =>
  records
    .map((record) => record.get('value'))
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

type FeatureVersionBindingLoad = {
  readonly id: string;
  readonly status: string;
  readonly canAutoActive: boolean;
  readonly bindings: readonly FeatureBindingReadiness[];
  readonly crossUnitBindings: readonly FeatureBindingReadiness[];
  readonly readyToProduction: boolean;
};

const isRawBindingReadinessRow = (value: unknown): value is RawBindingReadinessRow => {
  if (typeof value !== 'object' || value === null) return false;
  return 'applicationId' in value && 'componentVersionId' in value;
};

const toReadinessBindings = (raw: unknown): FeatureBindingReadiness[] => {
  const rows: unknown[] = Array.isArray(raw) ? raw : [];
  return rows.filter(isRawBindingReadinessRow).map((row) => toFeatureBindingReadiness(row));
};

const toCanAutoActive = (raw: unknown): boolean => raw === true || raw === 'true';

const bindingUsesBatchQuery = `
  MATCH (fv:FeatureVersion)
  WHERE fv.id IN $ids
  OPTIONAL MATCH (fv)-[uses:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
  OPTIONAL MATCH (c:Component {id: cv.componentId})
  OPTIONAL MATCH (app:Application {id: uses.applicationId})
  OPTIONAL MATCH (app)-[:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})
  OPTIONAL MATCH (av)-[hc:HAS_COMPONENT]->(cv)
  RETURN fv.id AS id,
    fv.status AS status,
    coalesce(fv.canAutoActive, false) AS canAutoActive,
    collect(CASE
      WHEN uses IS NULL THEN null
      ELSE {
        applicationId: uses.applicationId,
        applicationName: app.name,
        componentId: cv.componentId,
        componentName: coalesce(c.name, cv.name, ''),
        componentVersionId: cv.id,
        componentVersion: cv.version,
        unitId: coalesce(app.unitId, cv.unitId, ''),
        hasCurrentRelease: av IS NOT NULL,
        statusInRelease: hc.status
      }
    END) AS bindingRows
`;

const bindingCrossUnitBatchQuery = `
  MATCH (fv:FeatureVersion)
  WHERE fv.id IN $ids
  OPTIONAL MATCH (fv)-[:USES_COMPONENT_VERSION]->(cons:ComponentVersion)
  OPTIONAL MATCH (cons)-[dep:DEPENDS_ON]->(prov:ComponentVersion)
  WHERE cons.unitId IS NOT NULL
    AND prov.unitId IS NOT NULL
    AND cons.unitId <> prov.unitId
  WITH fv, dep, prov,
    CASE
      WHEN dep IS NULL THEN null
      ELSE coalesce(dep.providerApplicationId, '')
    END AS providerApplicationId
  OPTIONAL MATCH (provComp:Component {id: prov.componentId})
  OPTIONAL MATCH (provApp:Application {id: providerApplicationId})
  OPTIONAL MATCH (provApp)-[:HAS_VERSION]->(provAv:ApplicationVersion {status: 'current'})
  OPTIONAL MATCH (provAv)-[provHc:HAS_COMPONENT]->(prov)
  RETURN fv.id AS id,
    collect(DISTINCT CASE
      WHEN dep IS NULL THEN null
      ELSE {
        applicationId: coalesce(providerApplicationId, ''),
        applicationName: coalesce(provApp.name, ''),
        componentId: coalesce(prov.componentId, ''),
        componentName: coalesce(provComp.name, prov.name, ''),
        componentVersionId: prov.id,
        componentVersion: prov.version,
        unitId: coalesce(provApp.unitId, prov.unitId, ''),
        hasCurrentRelease: provAv IS NOT NULL,
        statusInRelease: provHc.status
      }
    END) AS crossUnitBindingRows
`;

const assertUsesComponentVersionTargetsAllowed = (
  targets: ReadonlyArray<{ rawStatus: unknown; componentId: string }>,
  inheritedComponentIds: ReadonlySet<string>,
): void => {
  for (const t of targets) {
    const st = parseVersionStatus(t.rawStatus);
    if (st === VersionStatus.Unactive) {
      throw new BadRequestException(
        'Цель USES_COMPONENT_VERSION не может быть в статусе unactive',
      );
    }
    if (st === VersionStatus.Deprecated && !inheritedComponentIds.has(t.componentId)) {
      throw new BadRequestException(
        'Связь с deprecated ComponentVersion допускается только при наследовании от ранее опубликованной версии фичи',
      );
    }
  }
};

const featureVersionWithRelationsQueryBody = `
  OPTIONAL MATCH (service:Service)-[aggregatesEdge:AGGREGATES]->(feature)
    WHERE coalesce(aggregatesEdge.deleted, false) = false
  WITH fv, collect(DISTINCT CASE
    WHEN service IS NULL THEN NULL
    ELSE {id: service.id, name: service.name}
  END) AS services
  OPTIONAL MATCH (fv)-[:INHERITED]->(inheritedPrev:FeatureVersion)
  WITH fv, services, inheritedPrev.id AS inheritedFromId
  OPTIONAL MATCH (fv)-[uses:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
  OPTIONAL MATCH (app:Application {id: uses.applicationId})
  OPTIONAL MATCH (team:Team)-[:MAINTAINS]->(:Component {id: cv.componentId})
  RETURN fv AS featureVersion,
    services,
    collect(DISTINCT CASE
      WHEN cv IS NULL THEN NULL
      ELSE {
        id: cv.id,
        name: cv.name,
        version: cv.version,
        status: cv.status,
        componentId: cv.componentId,
        isPublic: coalesce(cv.isPublic, false),
        applicationId: uses.applicationId,
        applicationName: app.name,
        edgeId: uses.id
      }
    END) AS componentVersions,
    count(DISTINCT cv.id) AS componentCount,
    count(DISTINCT team.id) AS teamCount,
    inheritedFromId
`;

const toComponentVersionViews = (raw: unknown) => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((cv) =>
      toComponentVersionView({
        id: String((cv as Record<string, unknown>).id ?? ''),
        properties: cv as Record<string, unknown>,
        label: 'ComponentVersion',
      }),
    )
    .filter((view): view is NonNullable<typeof view> => view !== null);
};

const toRelationCount = (value: unknown): number => Number(value ?? 0);

const toInheritedFromId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const id = String(value);
  return id === '' ? null : id;
};

const mapFeatureVersionRelations = (record: { get: (key: string) => unknown }) => {
  const fvNode = requireGraphNode(record.get('featureVersion'));
  return {
    ...serializeFv(fvNode),
    services: filterIdNames(record.get('services')),
    componentVersions: toComponentVersionViews(record.get('componentVersions')),
    componentCount: toRelationCount(record.get('componentCount')),
    teamCount: toRelationCount(record.get('teamCount')),
    inheritedFromId: toInheritedFromId(record.get('inheritedFromId')),
  };
};

@Injectable()
export class FeatureVersionService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly componentVersionService: ComponentVersionService,
  ) {}

  private async loadBindingReadinessBatch(
    featureVersionIds: readonly string[],
  ): Promise<Map<string, FeatureVersionBindingLoad>> {
    const ids = [...new Set(featureVersionIds)];
    if (ids.length === 0) return new Map();

    const usesResult = await this.neo4jService.read(bindingUsesBatchQuery, { ids });
    const crossUnitResult = await this.neo4jService.read(bindingCrossUnitBatchQuery, { ids });
    const crossUnitById = new Map<string, FeatureBindingReadiness[]>();
    for (const record of crossUnitResult.records) {
      const id = String(record.get('id') ?? '');
      if (id.length === 0) continue;
      crossUnitById.set(id, toReadinessBindings(record.get('crossUnitBindingRows')));
    }

    const loaded = new Map<string, FeatureVersionBindingLoad>();
    for (const record of usesResult.records) {
      const id = String(record.get('id') ?? '');
      if (id.length === 0) continue;
      const bindings = toReadinessBindings(record.get('bindingRows'));
      const crossUnitBindings = crossUnitById.get(id) ?? [];
      loaded.set(id, {
        id,
        status: String(record.get('status') ?? ''),
        canAutoActive: toCanAutoActive(record.get('canAutoActive')),
        bindings,
        crossUnitBindings,
        readyToProduction: draftReadyForProduction(bindings, crossUnitBindings),
      });
    }
    return loaded;
  }

  private async loadBindingReadiness(featureVersionId: string): Promise<FeatureVersionBindingLoad> {
    const loaded = await this.loadBindingReadinessBatch([featureVersionId]);
    const row = loaded.get(featureVersionId);
    if (!row) {
      throw new BadRequestException('FeatureVersion not found');
    }
    return row;
  }

  private async getReadyToProductionMap(featureVersionIds: readonly string[]) {
    const loaded = await this.loadBindingReadinessBatch(featureVersionIds);
    return new Map(
      [...loaded.values()].map((row) => {
        const ready = row.status !== VersionStatus.Draft ? false : row.readyToProduction;
        return [row.id, ready] as const;
      }),
    );
  }

  private async evaluateDraftReady(featureVersionId: string) {
    const loaded = await this.loadBindingReadiness(featureVersionId);
    return {
      id: loaded.id,
      status: loaded.status,
      canAutoActive: loaded.canAutoActive,
      readyToProduction: loaded.readyToProduction,
    };
  }

  private async autoActivateIfReady(featureVersionId: string) {
    const state = await this.evaluateDraftReady(featureVersionId);
    if (state.status !== VersionStatus.Draft) return state;
    if (state.canAutoActive && state.readyToProduction) {
      await this.publish({ featureVersionId });
      return this.evaluateDraftReady(featureVersionId);
    }
    return state;
  }

  @OnEvent(componentVersionStatusChangedEvent)
  async handleComponentVersionStatusChanged(payload: ComponentVersionStatusChangedPayload) {
    const query = `
      MATCH (fv:FeatureVersion {status: 'draft'})-[:USES_COMPONENT_VERSION]->(:ComponentVersion {id: $componentVersionId})
      RETURN DISTINCT fv.id AS value
    `;
    const result = await this.neo4jService.read(query, {
      componentVersionId: payload.componentVersionId,
    });
    const ids = collectedStrings(result.records);
    if (ids.length === 0) return;

    const loaded = await this.loadBindingReadinessBatch(ids);
    for (const featureVersionId of ids) {
      const row = loaded.get(featureVersionId);
      if (!row) continue;
      if (row.status !== VersionStatus.Draft) continue;
      if (!(row.canAutoActive && row.readyToProduction)) continue;
      try {
        await this.publish({ featureVersionId });
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }
      }
    }
  }

  async getFeatureVersionsByFeatureElementId(featureElementId: string) {
    const query = `
      MATCH (feature:Feature {id: $featureElementId})-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion)
      WITH DISTINCT feature, fv
      ${featureVersionWithRelationsQueryBody}
    `;

    const result = await this.neo4jService.read(query, { featureElementId });
    const items = result.records.map((record) => mapFeatureVersionRelations(record));

    const readyMap = await this.getReadyToProductionMap(items.map((item) => String(item.id)));
    const response = items.map((item) => ({
      ...item,
      readyToProduction: readyMap.get(String(item.id)) ?? false,
    }));

    return [...response].sort(compareFeatureVersions);
  }

  async findOne(id: string) {
    const query = `
      MATCH (fv:FeatureVersion {id: $featureVersionId})
      OPTIONAL MATCH (feature:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)
      WITH DISTINCT feature, fv
      ${featureVersionWithRelationsQueryBody}
    `;

    const result = await this.neo4jService.read(query, { featureVersionId: id });
    if (result.records.length === 0) {
      return null;
    }
    const mapped = mapFeatureVersionRelations(result.records[0]);
    const readyMap = await this.getReadyToProductionMap([id]);
    return {
      ...mapped,
      readyToProduction: readyMap.get(id) ?? false,
    };
  }

  async create(createFeatureVersionDto: CreateFeatureVersionBodyDto) {
    const id = randomUUID();

    const precheckQuery = `
      MATCH (feature:Feature {id: $featureId})
      OPTIONAL MATCH (feature)-[:HAS_DRAFT]->(draft:FeatureVersion)
      RETURN feature.id AS featureId, count(draft) AS draftCount
    `;
    const precheckResult = await this.neo4jService.read(precheckQuery, {
      featureId: createFeatureVersionDto.featureElementId,
    });
    const precheckRecord = precheckResult.records[0];
    const hasFeature = precheckRecord !== undefined;
    const draftCount = Number(precheckRecord?.get('draftCount') ?? 0);
    if (!hasFeature) {
      throw new BadRequestException('Feature not found');
    }
    if (draftCount > 0) {
      throw new BadRequestException('Feature already has a draft version');
    }

    const versionString = await resolveComponentOrFeatureVersionString(
      this.neo4jService,
      'Feature',
      createFeatureVersionDto.featureElementId,
      createFeatureVersionDto.version,
    );

    const createQuery = `
      MATCH (feature:Feature {id: $featureId})
      WHERE NOT (feature)-[:HAS_DRAFT]->(:FeatureVersion)
      OPTIONAL MATCH (feature)-[:HAS_VERSION]->(prev:FeatureVersion)
      WITH feature, prev
      ORDER BY prev.versionNumber DESC
      WITH feature, collect(prev)[0] AS active
      CREATE (newDraft:FeatureVersion {
        id: $id,
        featureId: $featureId,
        versionNumber: coalesce(active.versionNumber, -1) + 1,
        version: $version,
        status: 'draft',
        compatibility: 'compatible',
        canAutoActive: false,
        name: feature.name,
        type: 'featureVersion'
      })
      CREATE (feature)-[:HAS_DRAFT]->(newDraft)
      FOREACH (previousVersion IN CASE WHEN active IS NULL THEN [] ELSE [active] END |
        CREATE (newDraft)-[:INHERITED]->(previousVersion)
      )
      RETURN newDraft
    `;

    const result = await this.neo4jService.write(createQuery, {
      featureId: createFeatureVersionDto.featureElementId,
      id,
      version: versionString,
    });
    if (result.records.length === 0) {
      throw new BadRequestException(
        'Create failed: feature is missing or already has a draft version',
      );
    }
    requireGraphNode(result.records[0]?.get('newDraft'));

    const inheritedCvQuery = `
      MATCH (:FeatureVersion {id: $featureVersionId})-[:INHERITED]->(:FeatureVersion)
        -[uses:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      RETURN DISTINCT cv.id AS componentVersionId, uses.applicationId AS applicationId
    `;
    const inheritedRow = await this.neo4jService.read(inheritedCvQuery, { featureVersionId: id });
    const inheritedBindings: FeatureComponentVersionBinding[] = inheritedRow.records
      .map((record) => ({
        componentVersionId: String(record.get('componentVersionId') ?? ''),
        applicationId: String(record.get('applicationId') ?? ''),
      }))
      .filter((row) => row.componentVersionId.length > 0 && row.applicationId.length > 0);

    if (inheritedBindings.length > 0) {
      await this.appendUsesComponentVersionsNoResolve(id, inheritedBindings);
    }
    await this.inheritDependsOnFromPreviousFeatureVersion(id);

    return this.findOne(id);
  }

  private async inheritDependsOnFromPreviousFeatureVersion(featureVersionId: string) {
    const result = await this.neo4jService.read(
      `
      MATCH (draft:FeatureVersion {id: $featureVersionId})-[:INHERITED]->(prev:FeatureVersion)
      MATCH (prev)-[:USES_COMPONENT_VERSION]->(cons:ComponentVersion)
        -[dep:DEPENDS_ON]->(prov:ComponentVersion)
      WHERE dep.consumerFeatureVersionId = prev.id
      RETURN cons.id AS sourceId, prov.id AS targetId, properties(dep) AS context
      `,
      { featureVersionId },
    );
    for (const record of result.records) {
      const sourceId = record.get('sourceId');
      const targetId = record.get('targetId');
      const contextRaw = record.get('context');
      if (typeof sourceId !== 'string' || typeof targetId !== 'string') continue;
      const nextContext = buildInheritedFeatureDependsOnContext(
        parseDependsOnContext(contextRaw),
        featureVersionId,
      );
      await this.createDependsOnWithContext(sourceId, targetId, nextContext);
    }
  }

  async publish(createFeatureVersionDto: PublishFeatureVersionDto) {
    const loaded = await this.loadBindingReadiness(createFeatureVersionDto.featureVersionId);
    if (loaded.bindings.length === 0) {
      throw new BadRequestException('Нет связанных компонентов');
    }
    if (!loaded.readyToProduction) {
      throw new BadRequestException(
        'Нельзя активировать фичу. Нажмите «Проверить готовность», чтобы увидеть детали',
      );
    }

    const pins = await this.resolveApplicationVersionPins(
      createFeatureVersionDto.featureVersionId,
    );

    const query = `
      MATCH (feature:Feature)-[:HAS_DRAFT|HAS_VERSION]->(draft:FeatureVersion {id: $featureVersionId})
      WITH DISTINCT feature, draft
      OPTIONAL MATCH (feature)-[:HAS_DRAFT|HAS_VERSION]->(prev:FeatureVersion {status: 'active'})
        WHERE prev.id <> $featureVersionId
      SET prev.status = 'unactive'
      WITH DISTINCT feature, draft
      SET draft.status = 'active'
      WITH feature, draft
      OPTIONAL MATCH (draft)<-[draftLink:HAS_DRAFT]-()
      DELETE draftLink
      WITH DISTINCT feature, draft
      CREATE (feature)-[:HAS_VERSION]->(draft)
      WITH draft
      UNWIND $pins AS pin
      MATCH (av:ApplicationVersion {id: pin.applicationVersionId})
      CREATE (draft)-[:PINNED_TO_APPLICATION_VERSION]->(av)
      RETURN DISTINCT draft
    `;

    const result = await this.neo4jService.write(query, {
      featureVersionId: createFeatureVersionDto.featureVersionId,
      pins: pins.map((pin) => ({
        applicationId: pin.applicationId,
        applicationVersionId: pin.applicationVersionId,
      })),
    });
    if (result.records.length === 0) {
      throw new BadRequestException('Publish failed: not a draft or not linked via HAS_DRAFT/HAS_VERSION');
    }
    const node = requireGraphNode(result.records[0].get('draft'));
    return serializeFv(node);
  }

  private async resolveApplicationVersionPins(
    featureVersionId: string,
  ): Promise<readonly ApplicationVersionPin[]> {
    const requiredQuery = `
      MATCH (fv:FeatureVersion {id: $featureVersionId})
      OPTIONAL MATCH (fv)-[uses:USES_COMPONENT_VERSION]->(:ComponentVersion)
      WITH fv, collect(DISTINCT uses.applicationId) AS usesAppIds
      OPTIONAL MATCH (fv)-[:USES_COMPONENT_VERSION]->(cons:ComponentVersion)-[dep:DEPENDS_ON]->(:ComponentVersion)
      WHERE dep.consumerFeatureVersionId = fv.id
      WITH usesAppIds, collect(DISTINCT CASE
        WHEN dep IS NULL THEN null
        ELSE dep.providerApplicationId
      END) AS providerAppIds
      RETURN usesAppIds, providerAppIds
    `;
    const requiredResult = await this.neo4jService.read(requiredQuery, { featureVersionId });
    const requiredRec = requiredResult.records[0];
    const usesAppIdsRaw = requiredRec?.get('usesAppIds');
    const providerAppIdsRaw = requiredRec?.get('providerAppIds');
    const usesSources = (Array.isArray(usesAppIdsRaw) ? usesAppIdsRaw : [])
      .filter((id): id is string => typeof id === 'string')
      .map((applicationId) => ({ applicationId }));
    const providerSources = (Array.isArray(providerAppIdsRaw) ? providerAppIdsRaw : [])
      .filter((id): id is string => typeof id === 'string')
      .map((applicationId) => ({ applicationId }));
    const requiredApplicationIds = collectPinApplicationIds(usesSources, providerSources);

    const pinsQuery = `
      MATCH (fv:FeatureVersion {id: $featureVersionId})-[uses:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      MATCH (app:Application {id: uses.applicationId})-[:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})
        -[:HAS_COMPONENT]->(cv)
      RETURN DISTINCT uses.applicationId AS applicationId, av.id AS applicationVersionId
      UNION
      MATCH (fv:FeatureVersion {id: $featureVersionId})-[:USES_COMPONENT_VERSION]->(cons:ComponentVersion)
        -[dep:DEPENDS_ON]->(prov:ComponentVersion)
      WHERE dep.consumerFeatureVersionId = fv.id
      WITH DISTINCT coalesce(dep.providerApplicationId, '') AS applicationId, prov
      WHERE applicationId <> ''
      MATCH (app:Application {id: applicationId})-[:HAS_VERSION]->(av:ApplicationVersion {status: 'current'})
        -[:HAS_COMPONENT]->(prov)
      RETURN DISTINCT applicationId, av.id AS applicationVersionId
    `;
    const pinsResult = await this.neo4jService.read(pinsQuery, { featureVersionId });
    const resolved: ApplicationVersionPin[] = pinsResult.records.map((record) => ({
      applicationId: String(record.get('applicationId') ?? ''),
      applicationVersionId: String(record.get('applicationVersionId') ?? ''),
    }));
    try {
      return assertPinsCoverApplications(requiredApplicationIds, resolved);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot pin ApplicationVersion';
      throw new BadRequestException(message);
    }
  }

  private async reactivateInheritedUnactivePredecessor(featureVersionId: string): Promise<void> {
    const query = `
      MATCH (:FeatureVersion {id: $featureVersionId})-[:INHERITED]->(prev:FeatureVersion {status: 'unactive'})
      WITH prev
      LIMIT 1
      SET prev.status = 'active'
    `;
    await this.neo4jService.write(query, { featureVersionId });
  }

  async checkReadyToProduction(featureVersionId: string): Promise<CheckFeatureVersionReadyResult> {
    await this.autoActivateIfReady(featureVersionId);
    const featureVersion = await this.findOne(featureVersionId);
    if (featureVersion === null) {
      throw new BadRequestException('FeatureVersion not found');
    }
    const loaded = await this.loadBindingReadiness(featureVersionId);
    const reason =
      loaded.bindings.length === 0 ? FeatureVersionReadinessReason.NoComponentBindings : null;
    return {
      featureVersion: {
        id: String(featureVersion.id ?? featureVersionId),
        status: featureVersion.status,
        readyToProduction: featureVersion.readyToProduction === true,
      },
      readyToProduction: loaded.readyToProduction,
      reason,
      bindings: loaded.bindings,
      crossUnitBindings: loaded.crossUnitBindings,
    };
  }

  async transition(dto: { featureVersionId: string; status: VersionStatusType }) {
    const read = await this.neo4jService.read(
      `MATCH (fv:FeatureVersion {id: $featureVersionId}) RETURN fv`,
      { featureVersionId: dto.featureVersionId },
    );
    if (read.records.length === 0) {
      throw new BadRequestException('FeatureVersion not found');
    }
    const fvNode = requireGraphNode(read.records[0].get('fv'));
    const current = parseVersionStatus(fvNode.properties.status ?? fvNode.properties.state);
    if (!current) {
      throw new BadRequestException('Invalid version status');
    }

    if (!allowedTargetsFeatureVersion(current).includes(dto.status)) {
      throw new BadRequestException('Illegal status transition');
    }

    const id = dto.featureVersionId;

    if (current === VersionStatus.Draft && dto.status === VersionStatus.Active) {
      return this.publish({ featureVersionId: id });
    }

    if (current === VersionStatus.Active && dto.status === VersionStatus.Unactive) {
      const query = `
        MATCH (feature:Feature)-[versionLink:HAS_VERSION]->(fv:FeatureVersion {id: $featureVersionId})
        SET fv.status = $status
        DELETE versionLink
        RETURN DISTINCT fv
      `;
      const w = await this.neo4jService.write(query, {
        featureVersionId: id,
        status: dto.status,
      });
      return serializeFv(requireGraphNode(w.records[0]?.get('fv')));
    }

    if (current === VersionStatus.Active && dto.status === VersionStatus.Draft) {
      const query = `
        MATCH (feature:Feature)-[versionLink:HAS_VERSION]->(fv:FeatureVersion {id: $featureVersionId})
        WHERE NOT (feature)-[:HAS_DRAFT]->(:FeatureVersion)
        SET fv.status = 'draft'
        DELETE versionLink
        CREATE (feature)-[:HAS_DRAFT]->(fv)
        RETURN DISTINCT fv
      `;
      const w = await this.neo4jService.write(query, { featureVersionId: id });
      if (w.records.length === 0) {
        throw new BadRequestException('Transition to draft failed: conflict or not current active');
      }
      await this.reactivateInheritedUnactivePredecessor(id);
      return serializeFv(requireGraphNode(w.records[0].get('fv')));
    }

    if (current === VersionStatus.Unactive && dto.status === VersionStatus.Active) {
      const query = `
        MATCH (feature:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion {id: $featureVersionId})
        WITH DISTINCT feature, fv
        OPTIONAL MATCH (feature)-[:HAS_VERSION]->(prev:FeatureVersion)
          WHERE prev.id <> $featureVersionId
        SET prev.status = 'unactive'
        WITH DISTINCT feature, fv
        OPTIONAL MATCH (fv)<-[oldLink:HAS_VERSION|HAS_DRAFT]-()
        DELETE oldLink
        WITH DISTINCT feature, fv
        SET fv.status = 'active'
        CREATE (feature)-[:HAS_VERSION]->(fv)
        RETURN fv
      `;
      const wr = await this.neo4jService.write(query, { featureVersionId: id });
      return serializeFv(requireGraphNode(wr.records[0]?.get('fv')));
    }

    throw new BadRequestException('Unsupported transition');
  }

  private bindingKey = (binding: FeatureComponentVersionBinding): string =>
    `${binding.componentVersionId}::${binding.applicationId}`;

  private async appendUsesComponentVersionsNoResolve(
    featureVersionId: string,
    bindings: FeatureComponentVersionBinding[],
  ) {
    await this.assertDraftUsesBindingsAllowed(featureVersionId);
    if (bindings.length === 0) return;

    const bindingContext = await this.loadUsesBindingContext(featureVersionId);
    await this.validateUsesTargetsForUnit(
      featureVersionId,
      bindingContext,
      bindings,
      'appendUsesComponentVersionsNoResolve',
    );

    const linked = await this.readLinkedBindings(featureVersionId);
    const toLink = bindings.filter((binding) => !linked.has(this.bindingKey(binding)));
    await this.addUsesEdgesWhereMissing(featureVersionId, toLink);
  }

  async raiseComponentVersion(
    dto: RaiseFeatureComponentVersionDto,
  ): Promise<RaiseFeatureComponentVersionResult> {
    const featureVersionId = dto.featureVersionId.trim();
    const fromComponentVersionId = dto.fromComponentVersionId.trim();
    const applicationId = dto.applicationId.trim();
    const toComponentVersionIdRaw = dto.toComponentVersionId?.trim();
    if (!featureVersionId || !fromComponentVersionId || !applicationId) {
      throw new BadRequestException(
        'raise-component-version: featureVersionId, fromComponentVersionId and applicationId are required',
      );
    }

    await this.assertDraftUsesBindingsAllowed(featureVersionId);
    await this.assertUsesBindingExists(featureVersionId, fromComponentVersionId, applicationId);

    const fromMeta = await this.loadComponentVersionRaiseMeta(fromComponentVersionId);
    if (fromMeta.status === VersionStatus.Draft && !toComponentVersionIdRaw) {
      throw new BadRequestException(
        'raise-component-version: cannot create a new draft while fromComponentVersion is already draft',
      );
    }

    if (toComponentVersionIdRaw) {
      await this.assertRaiseTargetVersion(fromMeta, toComponentVersionIdRaw);
    }

    return this.neo4jService.writeInTransaction(async (run) => {
      let toComponentVersionId: string;
      let createdComponentVersion = false;
      if (toComponentVersionIdRaw) {
        toComponentVersionId = toComponentVersionIdRaw;
      } else {
        try {
          const created = await this.componentVersionService.create(
            { componentElementId: fromMeta.componentId },
            run,
          );
          toComponentVersionId = String(created.id);
          createdComponentVersion = true;
        } catch (error) {
          if (
            error instanceof BadRequestException &&
            String(error.message).includes('already has a draft')
          ) {
            throw new ConflictException(error.message);
          }
          throw error;
        }
      }

      await this.patchUsesComponentVersions(
        featureVersionId,
        [{ componentVersionId: toComponentVersionId, applicationId }],
        [{ componentVersionId: fromComponentVersionId, applicationId }],
        run,
      );
      await this.syncOutgoingDependsOnForApplication(
        fromComponentVersionId,
        toComponentVersionId,
        applicationId,
        featureVersionId,
        run,
      );
      await this.retargetIncomingDependsOnForRaise(
        fromComponentVersionId,
        toComponentVersionId,
        applicationId,
        featureVersionId,
        run,
      );

      return {
        fromComponentVersionId,
        toComponentVersionId,
        applicationId,
        createdComponentVersion,
      };
    });
  }

  async patchUsesComponentVersions(
    featureVersionId: string,
    addBindingsRaw: FeatureComponentVersionBinding[],
    removeBindingsRaw: FeatureComponentVersionBinding[],
    run?: Neo4jRun,
  ) {
    if (addBindingsRaw.length === 0 && removeBindingsRaw.length === 0) {
      throw new BadRequestException(
        'patchUsesComponentVersions: add or remove bindings must be non-empty',
      );
    }

    await this.assertDraftUsesBindingsAllowed(featureVersionId);
    const write: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.write(query, parameters));

    const resolveBinding = async (
      binding: FeatureComponentVersionBinding,
    ): Promise<FeatureComponentVersionBinding | null> => {
      const applicationId = binding.applicationId.trim();
      if (!applicationId) return null;
      const resolved = await resolveComponentOrVersionToVersionId(
        this.neo4jService,
        binding.componentVersionId,
        run,
      );
      if (!resolved) return null;
      return { componentVersionId: resolved, applicationId };
    };

    const addResolved = await Promise.all(addBindingsRaw.map(resolveBinding));
    const removeResolved = await Promise.all(removeBindingsRaw.map(resolveBinding));
    if (addResolved.some((row) => row === null) || removeResolved.some((row) => row === null)) {
      throw new BadRequestException(
        'patchUsesComponentVersions: unknown Component/ComponentVersion id or missing applicationId',
      );
    }
    const addBindings = [
      ...new Map(
        addResolved
          .filter((row): row is FeatureComponentVersionBinding => row !== null)
          .map((row) => [this.bindingKey(row), row]),
      ).values(),
    ];
    const removeBindings = [
      ...new Map(
        removeResolved
          .filter((row): row is FeatureComponentVersionBinding => row !== null)
          .map((row) => [this.bindingKey(row), row]),
      ).values(),
    ];

    for (const binding of removeBindings) {
      const dropQuery = `
        MATCH (:FeatureVersion {id: $featureVersionId})-[usesLink:USES_COMPONENT_VERSION {applicationId: $applicationId}]->(cv:ComponentVersion {id: $componentVersionId})
        DELETE usesLink
      `;
      await write(dropQuery, {
        featureVersionId,
        componentVersionId: binding.componentVersionId,
        applicationId: binding.applicationId,
      });
    }

    if (addBindings.length === 0) {
      return this.findOne(featureVersionId);
    }

    const bindingContext = await this.loadUsesBindingContext(featureVersionId, run);
    const linked = await this.readLinkedBindings(featureVersionId, run);
    const hasDuplicate = addBindings.some((binding) => linked.has(this.bindingKey(binding)));
    if (hasDuplicate) {
      throw new BadRequestException(
        'Такая версия компонента уже добавлена в это приложение',
      );
    }

    await this.validateUsesTargetsForUnit(
      featureVersionId,
      bindingContext,
      addBindings,
      'patchUsesComponentVersions',
      run,
    );
    await this.addUsesEdgesWhereMissing(featureVersionId, addBindings, run);

    return this.findOne(featureVersionId);
  }

  private async assertDraftUsesBindingsAllowed(featureVersionId: string) {
    const fvRead = await this.neo4jService.read(
      `MATCH (fv:FeatureVersion {id: $featureVersionId}) RETURN fv.status AS value`,
      { featureVersionId },
    );
    const fvStatus = parseVersionStatus(fvRead.records[0]?.get('value'));
    if (!fvStatus) {
      throw new BadRequestException('FeatureVersion not found');
    }
    if (fvStatus !== VersionStatus.Draft) {
      throw new BadRequestException(
        'Привязки компонентов FeatureVersion можно менять только в статусе draft',
      );
    }
  }

  private async assertUsesBindingExists(
    featureVersionId: string,
    componentVersionId: string,
    applicationId: string,
  ) {
    const result = await this.neo4jService.read(
      `
      MATCH (:FeatureVersion {id: $featureVersionId})
        -[:USES_COMPONENT_VERSION {applicationId: $applicationId}]->
        (:ComponentVersion {id: $componentVersionId})
      RETURN count(*) AS value
      `,
      { featureVersionId, componentVersionId, applicationId },
    );
    if (Number(result.records[0]?.get('value') ?? 0) === 0) {
      throw new BadRequestException(
        'raise-component-version: USES_COMPONENT_VERSION binding not found for fromComponentVersionId and applicationId',
      );
    }
  }

  private async loadComponentVersionRaiseMeta(componentVersionId: string): Promise<{
    componentId: string;
    versionNumber: number;
    status: VersionStatusType;
  }> {
    const result = await this.neo4jService.read(
      `
      MATCH (cv:ComponentVersion {id: $componentVersionId})
      RETURN cv.componentId AS componentId, cv.versionNumber AS versionNumber, cv.status AS status
      `,
      { componentVersionId },
    );
    const record = result.records[0];
    const componentId = record?.get('componentId');
    const status = parseVersionStatus(record?.get('status'));
    if (typeof componentId !== 'string' || !status) {
      throw new BadRequestException('raise-component-version: fromComponentVersionId not found');
    }
    return {
      componentId,
      versionNumber: Number(record?.get('versionNumber') ?? -1),
      status,
    };
  }

  private async assertRaiseTargetVersion(
    fromMeta: { componentId: string; versionNumber: number },
    toComponentVersionId: string,
  ) {
    const result = await this.neo4jService.read(
      `
      MATCH (cv:ComponentVersion {id: $toComponentVersionId})
      RETURN cv.componentId AS componentId, cv.versionNumber AS versionNumber, cv.status AS status
      `,
      { toComponentVersionId },
    );
    const record = result.records[0];
    const componentId = record?.get('componentId');
    const status = parseVersionStatus(record?.get('status'));
    const versionNumber = Number(record?.get('versionNumber') ?? -1);
    if (typeof componentId !== 'string' || !status) {
      throw new BadRequestException('raise-component-version: toComponentVersionId not found');
    }
    if (componentId !== fromMeta.componentId) {
      throw new BadRequestException(
        'raise-component-version: toComponentVersionId must belong to the same Component',
      );
    }
    if (!RAISE_TARGET_STATUSES.has(status)) {
      throw new BadRequestException(
        'raise-component-version: toComponentVersionId status must be draft, active or deprecated',
      );
    }
    if (!(versionNumber > fromMeta.versionNumber)) {
      throw new BadRequestException(
        'raise-component-version: toComponentVersionId must be newer than fromComponentVersionId',
      );
    }
  }

  private async syncOutgoingDependsOnForApplication(
    fromComponentVersionId: string,
    toComponentVersionId: string,
    applicationId: string,
    featureVersionId: string,
    run?: Neo4jRun,
  ) {
    const sourceEdges = await this.readOutgoingDependsOnForRaise(
      fromComponentVersionId,
      applicationId,
      featureVersionId,
      run,
    );
    if (sourceEdges.length === 0) {
      await this.rewriteOutgoingDependsOnFeatureVersion(
        toComponentVersionId,
        applicationId,
        featureVersionId,
        run,
      );
      return;
    }
    await this.deleteOutgoingDependsOnForRaise(
      toComponentVersionId,
      applicationId,
      featureVersionId,
      run,
    );
    for (const edge of sourceEdges) {
      const context = buildRaisedDependsOnContext(edge.context, featureVersionId, applicationId);
      await this.createDependsOnWithContext(toComponentVersionId, edge.targetId, context, run);
    }
  }

  private async retargetIncomingDependsOnForRaise(
    fromComponentVersionId: string,
    toComponentVersionId: string,
    applicationId: string,
    featureVersionId: string,
    run?: Neo4jRun,
  ) {
    const write: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.write(query, parameters));
    const execute: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.read(query, parameters));
    const edges = await this.readIncomingDependsOnForRaise(
      fromComponentVersionId,
      applicationId,
      featureVersionId,
      run,
    );
    for (const edge of edges) {
      const matchKeys = dependsOnMatchKeyParams(edge.context);
      await write(
        `
        MATCH (source:ComponentVersion {id: $sourceId})-[r:DEPENDS_ON]->(:ComponentVersion {id: $fromId})
        WHERE ${dependsOnMatchKeysWhere('r')}
        DELETE r
        `,
        {
          sourceId: edge.sourceId,
          fromId: fromComponentVersionId,
          ...matchKeys,
        },
      );
      if (edge.sourceId === toComponentVersionId) continue;
      const existing = await execute(
        `
        MATCH (:ComponentVersion {id: $sourceId})-[r:DEPENDS_ON]->(:ComponentVersion {id: $toId})
        WHERE ${dependsOnMatchKeysWhere('r')}
        RETURN count(*) AS value
        `,
        {
          sourceId: edge.sourceId,
          toId: toComponentVersionId,
          ...matchKeys,
        },
      );
      if (Number(existing.records[0]?.get('value') ?? 0) > 0) continue;
      await this.createDependsOnWithContext(edge.sourceId, toComponentVersionId, edge.context, run);
    }
  }

  private async readIncomingDependsOnForRaise(
    componentVersionId: string,
    applicationId: string,
    featureVersionId: string,
    run?: Neo4jRun,
  ): Promise<ReadonlyArray<{ sourceId: string; context: DependsOnContextDto }>> {
    const execute: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.read(query, parameters));
    const result = await execute(
      `
      MATCH (source:ComponentVersion)-[r:DEPENDS_ON]->(cv:ComponentVersion {id: $componentVersionId})
      RETURN source.id AS sourceId, properties(r) AS context
      `,
      { componentVersionId },
    );
    return result.records
      .map((record) => {
        const sourceId = record.get('sourceId');
        const context = parseDependsOnContext(record.get('context'));
        if (
          typeof sourceId !== 'string' ||
          !isRaiseDependsOnIncomingEdge(context, applicationId, featureVersionId)
        ) {
          return null;
        }
        return { sourceId, context };
      })
      .filter((row): row is { sourceId: string; context: DependsOnContextDto } => row !== null);
  }

  private async readOutgoingDependsOnForRaise(
    componentVersionId: string,
    applicationId: string,
    featureVersionId: string,
    run?: Neo4jRun,
  ): Promise<ReadonlyArray<{ targetId: string; context: DependsOnContextDto }>> {
    const execute: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.read(query, parameters));
    const result = await execute(
      `
      MATCH (cv:ComponentVersion {id: $componentVersionId})-[r:DEPENDS_ON]->(target:ComponentVersion)
      RETURN target.id AS targetId, properties(r) AS context
      `,
      { componentVersionId },
    );
    return result.records
      .map((record) => {
        const targetId = record.get('targetId');
        const context = parseDependsOnContext(record.get('context'));
        if (
          typeof targetId !== 'string' ||
          !isRaiseDependsOnSourceEdge(context, applicationId, featureVersionId)
        ) {
          return null;
        }
        return { targetId, context };
      })
      .filter((row): row is { targetId: string; context: DependsOnContextDto } => row !== null);
  }

  private async deleteOutgoingDependsOnForRaise(
    componentVersionId: string,
    applicationId: string,
    featureVersionId: string,
    run?: Neo4jRun,
  ) {
    const write: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.write(query, parameters));
    const edges = await this.readOutgoingDependsOnForRaise(
      componentVersionId,
      applicationId,
      featureVersionId,
      run,
    );
    for (const edge of edges) {
      await write(
        `
        MATCH (cv:ComponentVersion {id: $componentVersionId})-[r:DEPENDS_ON]->(target:ComponentVersion {id: $targetId})
        WHERE ${dependsOnMatchKeysWhere('r')}
        DELETE r
        `,
        {
          componentVersionId,
          targetId: edge.targetId,
          ...dependsOnMatchKeyParams(edge.context),
        },
      );
    }
  }

  private async rewriteOutgoingDependsOnFeatureVersion(
    componentVersionId: string,
    applicationId: string,
    featureVersionId: string,
    run?: Neo4jRun,
  ) {
    const write: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.write(query, parameters));
    const edges = await this.readOutgoingDependsOnForRaise(
      componentVersionId,
      applicationId,
      featureVersionId,
      run,
    );
    for (const edge of edges) {
      const context = buildRaisedDependsOnContext(edge.context, featureVersionId, applicationId);
      if (dependsOnContextsEqual(context, edge.context)) continue;
      await write(
        `
        MATCH (cv:ComponentVersion {id: $componentVersionId})-[r:DEPENDS_ON]->(target:ComponentVersion {id: $targetId})
        WHERE ${dependsOnMatchKeysWhere('r')}
        SET r += $props
        `,
        {
          componentVersionId,
          targetId: edge.targetId,
          ...dependsOnMatchKeyParams(edge.context),
          props: dependsOnContextProps(context),
        },
      );
    }
  }

  private async createDependsOnWithContext(
    sourceComponentVersionId: string,
    targetComponentVersionId: string,
    context: DependsOnContextDto,
    run?: Neo4jRun,
  ) {
    const write: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.write(query, parameters));
    await write(
      `
      MATCH (from:ComponentVersion {id: $source})
      MATCH (to:ComponentVersion {id: $target})
      WHERE from <> to
      CREATE (from)-[:DEPENDS_ON $props]->(to)
      `,
      {
        source: sourceComponentVersionId,
        target: targetComponentVersionId,
        props: dependsOnContextProps(context),
      },
    );
  }

  private async loadUsesBindingContext(
    featureVersionId: string,
    run?: Neo4jRun,
  ): Promise<{
    unitId: string;
    inheritedComponentIds: Set<string>;
  }> {
    const execute: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.read(query, parameters));
    const unitQuery = `
      MATCH (feature:Feature)-[:HAS_VERSION|HAS_DRAFT]->(:FeatureVersion {id: $featureVersionId})
      RETURN feature.unitId AS value
      LIMIT 1
    `;
    const tidRow = await execute(unitQuery, { featureVersionId });
    const unitId = tidRow.records[0]?.get('value');
    if (typeof unitId !== 'string') {
      throw new BadRequestException('FeatureVersion not found');
    }

    const inheritedQuery = `
      MATCH (:FeatureVersion {id: $featureVersionId})-[:INHERITED]->(:FeatureVersion)
        -[:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      RETURN DISTINCT cv.componentId AS value
    `;
    const inhRow = await execute(inheritedQuery, { featureVersionId });
    const inheritedComponentIds = new Set<string>(collectedStrings(inhRow.records));

    return { unitId, inheritedComponentIds };
  }

  private async validateUsesTargetsForUnit(
    featureVersionId: string,
    bindingContext: { unitId: string; inheritedComponentIds: Set<string> },
    bindings: FeatureComponentVersionBinding[],
    errorPrefix: string,
    run?: Neo4jRun,
  ) {
    const execute: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.read(query, parameters));
    const cvIds = [...new Set(bindings.map((b) => b.componentVersionId))];
    const validateQuery = `
      MATCH (cv:ComponentVersion {unitId: $unitId})
      WHERE cv.id IN $componentVersionIds
      WITH DISTINCT cv
      OPTIONAL MATCH (av:ApplicationVersion {status: 'current'})-[hc:HAS_COMPONENT]->(cv)
      RETURN cv.id AS id, cv.componentId AS componentId, cv.status AS status,
        collect(DISTINCT {applicationId: av.applicationId, status: hc.status}) AS appEdges
    `;
    const vr = await execute(validateQuery, {
      unitId: bindingContext.unitId,
      componentVersionIds: cvIds,
    });
    if (vr.records.length !== cvIds.length) {
      throw new BadRequestException(
        `${errorPrefix}: некорректные цели или несовпадение юнита для FeatureVersion ${featureVersionId}`,
      );
    }

    const appCheck = `
      UNWIND $applicationIds AS applicationId
      MATCH (app:Application {id: applicationId, unitId: $unitId})
      RETURN app.id AS value
    `;
    const applicationIds = [...new Set(bindings.map((b) => b.applicationId))];
    const apps = await execute(appCheck, {
      unitId: bindingContext.unitId,
      applicationIds,
    });
    if (apps.records.length !== applicationIds.length) {
      throw new BadRequestException(
        `${errorPrefix}: applicationId must belong to the same unit as FeatureVersion ${featureVersionId}`,
      );
    }

    const byCv = new Map(
      vr.records.map((record) => [
        String(record.get('id') ?? ''),
        {
          componentId: String(record.get('componentId') ?? ''),
          rawStatus: record.get('status'),
          appEdges: Array.isArray(record.get('appEdges'))
            ? (record.get('appEdges') as Array<Record<string, unknown>>)
            : [],
        },
      ]),
    );

    const targets = bindings.map((binding) => {
      const cv = byCv.get(binding.componentVersionId);
      if (!cv) {
        throw new BadRequestException(
          `${errorPrefix}: некорректные цели или несовпадение юнита для FeatureVersion ${featureVersionId}`,
        );
      }
      const edge = cv.appEdges.find(
        (row) => String(row.applicationId ?? '') === binding.applicationId,
      );
      const effectiveStatus = edge?.status ?? cv.rawStatus;
      return { rawStatus: effectiveStatus, componentId: cv.componentId };
    });
    assertUsesComponentVersionTargetsAllowed(targets, bindingContext.inheritedComponentIds);
  }

  private async readLinkedBindings(
    featureVersionId: string,
    run?: Neo4jRun,
  ): Promise<ReadonlySet<string>> {
    const execute: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.read(query, parameters));
    const query = `
      MATCH (:FeatureVersion {id: $featureVersionId})-[uses:USES_COMPONENT_VERSION]->(cv:ComponentVersion)
      RETURN cv.id AS componentVersionId, uses.applicationId AS applicationId
    `;
    const row = await execute(query, { featureVersionId });
    return new Set(
      row.records
        .map((record) => ({
          componentVersionId: String(record.get('componentVersionId') ?? ''),
          applicationId: String(record.get('applicationId') ?? ''),
        }))
        .filter((binding) => binding.componentVersionId.length > 0 && binding.applicationId.length > 0)
        .map((binding) => this.bindingKey(binding)),
    );
  }

  private async addUsesEdgesWhereMissing(
    featureVersionId: string,
    bindings: FeatureComponentVersionBinding[],
    run?: Neo4jRun,
  ) {
    const write: Neo4jRun = run ?? ((query, parameters) => this.neo4jService.write(query, parameters));
    for (const binding of bindings) {
      const linkQuery = `
        MATCH (fv:FeatureVersion {id: $featureVersionId}), (cv:ComponentVersion {id: $componentVersionId})
        CREATE (fv)-[:USES_COMPONENT_VERSION {id: $edgeId, applicationId: $applicationId}]->(cv)
      `;
      await write(linkQuery, {
        featureVersionId,
        componentVersionId: binding.componentVersionId,
        applicationId: binding.applicationId,
        edgeId: randomUUID(),
      });
    }
  }

  async remove(id: string) {
    const checkQuery = `
      MATCH (feature:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv:FeatureVersion {id: $featureVersionId, status: 'draft'})
      WITH DISTINCT fv
      OPTIONAL MATCH (fv)<-[incomingRel]-(source)
        WHERE NOT type(incomingRel) IN ['HAS_DRAFT', 'HAS_VERSION', 'INHERITED']
      WITH fv, collect(DISTINCT CASE
        WHEN incomingRel IS NULL THEN NULL
        ELSE {
          relationType: type(incomingRel),
          direction: '${BlockingRelationDirection.Incoming}',
          targetId: source.id,
          targetKind: labels(source)[0],
          targetName: coalesce(source.name, source.version, source.id)
        }
      END) AS incoming
      OPTIONAL MATCH (fv)-[outgoingRel]->(target)
        WHERE NOT type(outgoingRel) IN ['INHERITED', 'USES_COMPONENT_VERSION']
      RETURN fv.id AS id, incoming, collect(DISTINCT CASE
        WHEN outgoingRel IS NULL THEN NULL
        ELSE {
          relationType: type(outgoingRel),
          direction: '${BlockingRelationDirection.Outgoing}',
          targetId: target.id,
          targetKind: labels(target)[0],
          targetName: coalesce(target.name, target.version, target.id)
        }
      END) AS outgoing
    `;
    const check = await this.neo4jService.read(checkQuery, { featureVersionId: id });
    if (check.records.length === 0) {
      throw new Error('Cannot delete featureVersion: must be latest draft');
    }
    const incoming = parseBlockingRelations(check.records[0].get('incoming'));
    const outgoing = parseBlockingRelations(check.records[0].get('outgoing'));
    const blockingRelations = [...incoming, ...outgoing];
    if (blockingRelations.length > 0) {
      throwDeletionBlocked('featureVersion', blockingRelations);
    }

    await this.neo4jService.write(
      `
      MATCH ()-[dep:DEPENDS_ON]->()
      WHERE dep.consumerFeatureVersionId = $featureVersionId
      DELETE dep
      `,
      { featureVersionId: id },
    );
    await this.neo4jService.write(
      `MATCH (fv:FeatureVersion {id: $featureVersionId}) DETACH DELETE fv`,
      { featureVersionId: id },
    );
    return { id };
  }
}
