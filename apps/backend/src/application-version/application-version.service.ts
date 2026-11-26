import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  ApplicationVersionStatus,
  isApplicationComponentStatus,
  parseVersionStatus,
  VersionStatus,
  type ApplicationComponentStatus,
  type ApplicationVersionComposition,
  type ApplicationVersionCompositionItem,
  type RenameApplicationVersionDto,
  type ReleaseApplicationDto,
  type ReleaseComponentSelectionDto,
  type ReleasePreviewDto,
  type ReleasePreviewLeavingVersion,
  type ReleasePreviewResponse,
  type RevertApplicationDto,
  type VersionStatus as VersionStatusType,
  ReleasePreviewMode,
} from '@stellode/models';
import {
  requireGraphNode,
  toComponentSummary,
  toComponentVersionSummary,
  toNewerVersionRow,
  isNewerVersionRow,
  isGraphNode,
  serializeCv,
} from '../common/graph-helpers';
import {
  assertVersionUniqueWithinParent,
  resolveApplicationReleaseVersionString,
} from '../common/parent-version-uniqueness';
import { componentVersionStatusChangedEvent } from '../common/component-version-events';
import { recomputeComponentVersionStatuses } from '../common/recompute-component-version-status';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';

const serializeNode = (node: GraphNode) => {
  const p = node.properties;
  return { id: (p.id as string) ?? node.id, ...p };
};

const mapAppVersionRow = (node: GraphNode) => {
  const p = node.properties as Record<string, unknown>;
  return { id: (p.id as string) ?? node.id, ...p };
};

const normalizeComponents = (
  components: ReleaseComponentSelectionDto[] | undefined,
): ReleaseComponentSelectionDto[] => {
  const list = components ?? [];
  const byId = new Map<string, ReleaseComponentSelectionDto>();
  for (const row of list) {
    const componentVersionId = String(row.componentVersionId ?? '').trim();
    const status = String(row.status ?? '').trim();
    if (!componentVersionId || !isApplicationComponentStatus(status)) {
      throw new BadRequestException(
        'Each component requires componentVersionId and status active|deprecated',
      );
    }
    byId.set(componentVersionId, { componentVersionId, status });
  }
  return [...byId.values()];
};

@Injectable()
export class ApplicationVersionService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getApplicationVersionsByApplicationElementId(applicationElementId: string) {
    const query = `
      MATCH (a:Application {id: $applicationId})-[:HAS_VERSION]->(av:ApplicationVersion)
      RETURN av
      ORDER BY av.status ASC, coalesce(av.versionNumber, -1) DESC
    `;
    const result = await this.neo4jService.read(query, { applicationId: applicationElementId });
    return result.records
      .map((record) => record.get('value') ?? record.get('av'))
      .filter(isGraphNode)
      .map(mapAppVersionRow);
  }

  async renameVersion(id: string, dto: RenameApplicationVersionDto) {
    const trimmed = String(dto.version ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Version must not be empty');
    }
    const findQuery = `
      MATCH (a:Application)-[:HAS_VERSION]->(av:ApplicationVersion {id: $id})
      RETURN a.id AS applicationId, av
    `;
    const findResult = await this.neo4jService.read(findQuery, { id });
    const findRecord = findResult.records[0];
    if (!findRecord) {
      throw new BadRequestException('ApplicationVersion not found');
    }
    const applicationId = String(findRecord.get('applicationId') ?? '');
    const av = findRecord.get('av');
    if (!isGraphNode(av) || !applicationId) {
      throw new BadRequestException('ApplicationVersion not found');
    }
    const props = av.properties as Record<string, unknown>;
    if (String(props.status ?? '') !== ApplicationVersionStatus.Current) {
      throw new BadRequestException('Only current ApplicationVersion can be renamed');
    }
    if (String(props.version ?? '') === trimmed) {
      return mapAppVersionRow(av);
    }
    await assertVersionUniqueWithinParent(
      this.neo4jService,
      'Application',
      applicationId,
      trimmed,
    );
    const writeQuery = `
      MATCH (av:ApplicationVersion {id: $id, status: 'current'})
      SET av.version = $version
      RETURN av
    `;
    const writeResult = await this.neo4jService.write(writeQuery, { id, version: trimmed });
    const updated = writeResult.records[0]?.get('av') ?? writeResult.records[0]?.get('value');
    if (!isGraphNode(updated)) {
      throw new BadRequestException('ApplicationVersion not found');
    }
    return mapAppVersionRow(updated);
  }

  async getComposition(applicationVersionId: string): Promise<ApplicationVersionComposition> {
    const metaQuery = `
      MATCH (a:Application)-[:HAS_VERSION]->(av:ApplicationVersion {id: $applicationVersionId})
      RETURN a.id AS applicationId, av
    `;
    const metaResult = await this.neo4jService.read(metaQuery, { applicationVersionId });
    const metaRecord = metaResult.records[0];
    if (!metaRecord) {
      throw new NotFoundException('ApplicationVersion not found');
    }
    const applicationId = String(metaRecord.get('applicationId') ?? '');
    const av = metaRecord.get('av');
    if (!isGraphNode(av) || !applicationId) {
      throw new NotFoundException('ApplicationVersion not found');
    }
    const avProps = av.properties as Record<string, unknown>;
    const avStatusRaw = String(avProps.status ?? '');
    const status =
      avStatusRaw === ApplicationVersionStatus.Previous
        ? ApplicationVersionStatus.Previous
        : ApplicationVersionStatus.Current;
    const itemsQuery = `
      MATCH (av:ApplicationVersion {id: $applicationVersionId})-[hc:HAS_COMPONENT]->(cv:ComponentVersion)
      OPTIONAL MATCH (linked:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      OPTIONAL MATCH (byProp:Component {id: cv.componentId})
      WITH hc, cv, coalesce(head(collect(DISTINCT linked)), head(collect(DISTINCT byProp))) AS c
      WHERE c IS NOT NULL
      OPTIONAL MATCH (team:Team)-[:MAINTAINS]->(c)
      WITH hc, cv, c, head(collect(team)) AS team
      RETURN cv.id AS componentVersionId, c.id AS componentId, c.name AS componentName,
        team.id AS teamId, team.name AS teamName, cv.version AS componentVersion,
        hc.status AS status, cv.status AS componentVersionStatus
      ORDER BY c.name ASC
    `;
    const itemsResult = await this.neo4jService.read(itemsQuery, { applicationVersionId });
    const items: ApplicationVersionCompositionItem[] = itemsResult.records.map((record) => {
      const statusRaw = String(record.get('status') ?? '');
      const itemStatus = isApplicationComponentStatus(statusRaw)
        ? statusRaw
        : VersionStatus.Active;
      const globalStatus =
        parseVersionStatus(record.get('componentVersionStatus')) ?? VersionStatus.Active;
      const teamIdRaw = record.get('teamId');
      const teamNameRaw = record.get('teamName');
      return {
        componentVersionId: String(record.get('componentVersionId') ?? ''),
        componentId: String(record.get('componentId') ?? ''),
        componentName: String(record.get('componentName') ?? ''),
        teamId: teamIdRaw === null || teamIdRaw === undefined ? null : String(teamIdRaw),
        teamName: teamNameRaw === null || teamNameRaw === undefined ? null : String(teamNameRaw),
        componentVersion: String(record.get('componentVersion') ?? ''),
        status: itemStatus,
        componentVersionStatus: globalStatus,
      };
    });
    return {
      applicationVersionId: String(avProps.id ?? applicationVersionId),
      applicationId,
      version: String(avProps.version ?? ''),
      status,
      items,
    };
  }

  async getComponentsForRelease(applicationVersionId: string) {
    const query = `
      MATCH (av:ApplicationVersion {id: $applicationVersionId})-[hc:HAS_COMPONENT]->(cv:ComponentVersion)
      WITH hc, cv, av.unitId AS tid, av.applicationId AS thisAppId
      OPTIONAL MATCH (linked:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      OPTIONAL MATCH (byProp:Component {id: cv.componentId})
      WITH tid, thisAppId, cv, hc,
        coalesce(head(collect(DISTINCT linked)), head(collect(DISTINCT byProp))) AS c
      WHERE c IS NOT NULL
      RETURN cv, c, hc.status AS applicationStatus,
        head(COLLECT {
          MATCH (team:Team)-[:MAINTAINS]->(c)
          RETURN {id: team.id, name: team.name}
        }) AS team,
        COLLECT {
          MATCH (newer:ComponentVersion {componentId: c.id, unitId: tid})
          WHERE newer.versionNumber > cv.versionNumber
          RETURN {id: newer.id, version: newer.version, versionNumber: newer.versionNumber, status: newer.status}
        } AS newerVersions,
        COLLECT {
          MATCH (otherAv:ApplicationVersion {status: 'current'})-[otherHc:HAS_COMPONENT]->(cv)
          WHERE otherAv.applicationId <> thisAppId
          OPTIONAL MATCH (app:Application {id: otherAv.applicationId})
          RETURN {
            applicationId: otherAv.applicationId,
            applicationName: app.name,
            status: otherHc.status
          }
        } AS otherApplications
    `;

    const result = await this.neo4jService.read(query, { applicationVersionId });
    return result.records.map((r) => {
      const cv = serializeCv(requireGraphNode(r.get('cv')));
      const c = serializeNode(requireGraphNode(r.get('c')));
      const team = r.get('team') as { id: string; name: string } | null;
      const newerRaw = r.get('newerVersions') as unknown[];
      const newerVersions = newerRaw
        .filter((x): x is Record<string, unknown> => isNewerVersionRow(x))
        .map(toNewerVersionRow)
        .sort((a, b) => b.versionNumber - a.versionNumber);
      const applicationStatusRaw = String(r.get('applicationStatus') ?? '');
      const applicationStatus = isApplicationComponentStatus(applicationStatusRaw)
        ? applicationStatusRaw
        : VersionStatus.Active;
      const otherRaw = r.get('otherApplications');
      const otherApplications = Array.isArray(otherRaw)
        ? otherRaw
            .filter(
              (row): row is Record<string, unknown> =>
                typeof row === 'object' && row !== null,
            )
            .map((row) => ({
              applicationId: String(row.applicationId ?? ''),
              applicationName: String(row.applicationName ?? ''),
              status: isApplicationComponentStatus(String(row.status ?? ''))
                ? String(row.status)
                : VersionStatus.Active,
            }))
            .filter((row) => row.applicationId.length > 0)
        : [];
      const cRec = c as Record<string, unknown>;
      const cvRec = cv as Record<string, unknown>;
      return {
        component: toComponentSummary(cRec),
        team: team ?? null,
        componentVersion: toComponentVersionSummary(cvRec),
        applicationStatus,
        otherApplications,
        hasNewerVersion: newerVersions.length > 0,
        newerVersions,
      };
    });
  }

  private readonly introReleaseStatuses: ReadonlySet<VersionStatusType> = new Set([
    VersionStatus.Active,
    VersionStatus.Deprecated,
    VersionStatus.Draft,
  ]);

  private async validateDraftsLinkedForRelease(unitId: string, componentVersionIds: string[]) {
    const uniqueCvIds = [...new Set(componentVersionIds)];
    const query = `
      MATCH (cv:ComponentVersion {unitId: $unitId, status: 'draft'})
      WHERE cv.id IN $componentVersionIds
      RETURN cv.id AS id,
        coalesce(cv.componentId, '') AS componentIdProp,
        [(cv)<-[:HAS_DRAFT]-(parent:Component) | parent.id] AS parentIds
    `;
    const result = await this.neo4jService.read(query, {
      unitId,
      componentVersionIds: uniqueCvIds,
    });
    for (const row of result.records) {
      const draftId = String(row.get('id') ?? '').trim();
      if (!draftId) continue;
      const parentIdsRaw = row.get('parentIds');
      const parentIds = Array.isArray(parentIdsRaw)
        ? parentIdsRaw.map((x) => String(x ?? '')).filter((x) => x.length > 0)
        : [];
      if (parentIds.length === 0) {
        throw new BadRequestException(
          `Релиз не выполнен: каждая draft ComponentVersion в релизе должна быть связана с Component через HAS_DRAFT. componentVersionId=${draftId}`,
        );
      }
    }
  }

  private async hasInheritedPathTo(selectedId: string, targetCvId: string): Promise<boolean> {
    if (selectedId === targetCvId) return true;
    const query = `
      MATCH (start:ComponentVersion {id: $selectedId})
      RETURN EXISTS {
        MATCH (start)-[:INHERITED*1..20]->(:ComponentVersion {id: $targetCvId})
      } AS value
    `;
    const result = await this.neo4jService.read(query, { selectedId, targetCvId });
    return Boolean(result.records[0]?.get('value'));
  }

  private async validateOneSelectedRow(
    sourceApplicationVersionId: string,
    unitId: string,
    componentVersionId: string,
  ): Promise<{
    selectedId: string;
    currentCount: number;
    pathCount: number;
    selectedStatus: string;
    componentId: string;
  } | null> {
    const selQuery = `
      MATCH (cv:ComponentVersion {id: $componentVersionId, unitId: $unitId})
      RETURN cv
    `;
    const selResult = await this.neo4jService.read(selQuery, { componentVersionId, unitId });
    const selNode = selResult.records[0]?.get('value') ?? selResult.records[0]?.get('cv');
    if (!isGraphNode(selNode)) return null;
    const compId = String(selNode.properties.componentId ?? '');
    const selectedStatus = String(selNode.properties.status ?? '');
    const curQuery = `
      MATCH (av:ApplicationVersion {id: $sourceApplicationVersionId, status: 'current'})
        -[:HAS_COMPONENT]->(cv:ComponentVersion {unitId: $unitId, componentId: $componentId})
      RETURN cv.id AS value
    `;
    const curRecords = await this.neo4jService.read(curQuery, {
      sourceApplicationVersionId,
      unitId,
      componentId: compId,
    });
    const curIds = curRecords.records.map((r) => String(r.get('value') ?? '')).filter((x) => x.length > 0);
    let pathCount = 0;
    if (curIds.length > 0) {
      const anyPath = await Promise.all(
        curIds.map((curId) => this.hasInheritedPathTo(componentVersionId, curId)),
      );
      pathCount = anyPath.some(Boolean) ? 1 : 0;
    }
    return {
      selectedId: componentVersionId,
      currentCount: curIds.length,
      pathCount,
      selectedStatus,
      componentId: compId,
    };
  }

  private assertAtMostOneActivePerComponent(
    components: ReleaseComponentSelectionDto[],
    componentIdByCvId: Map<string, string>,
  ) {
    const activeByComponent = new Map<string, string>();
    for (const row of components) {
      if (row.status !== VersionStatus.Active) continue;
      const componentId = componentIdByCvId.get(row.componentVersionId) ?? '';
      if (!componentId) continue;
      const previous = activeByComponent.get(componentId);
      if (previous && previous !== row.componentVersionId) {
        throw new BadRequestException(
          'Release failed: application release must include at most one active HAS_COMPONENT row per Component',
        );
      }
      activeByComponent.set(componentId, row.componentVersionId);
    }
  }

  private async countApplicationVersions(applicationId: string): Promise<number> {
    const query = `
      MATCH (a:Application {id: $applicationId})-[:HAS_VERSION]->(av:ApplicationVersion)
      RETURN count(av) AS value
    `;
    const result = await this.neo4jService.read(query, { applicationId });
    return Number(result.records[0]?.get('value') ?? 0);
  }

  private async loadUnitId(applicationId: string): Promise<string> {
    const tidQuery = `
      MATCH (a:Application {id: $applicationId})
      RETURN a.unitId AS value
    `;
    const tidResult = await this.neo4jService.read(tidQuery, { applicationId });
    return String(tidResult.records[0]?.get('value') ?? '');
  }

  private async validateFirstReleaseSelection(
    applicationId: string,
    components: ReleaseComponentSelectionDto[],
  ): Promise<{ unitId: string; componentIdByCvId: Map<string, string> }> {
    const unitId = await this.loadUnitId(applicationId);
    if (!unitId) {
      throw new BadRequestException('Release failed: application not found or missing unitId');
    }
    const componentIdByCvId = new Map<string, string>();
    for (const row of components) {
      const selQuery = `
        MATCH (cv:ComponentVersion {id: $componentVersionId, unitId: $unitId})
        RETURN cv
      `;
      const selResult = await this.neo4jService.read(selQuery, {
        componentVersionId: row.componentVersionId,
        unitId,
      });
      const selNode = selResult.records[0]?.get('value') ?? selResult.records[0]?.get('cv');
      if (!isGraphNode(selNode)) {
        throw new BadRequestException(
          'Release failed: component versions must belong to unit and match the current application version',
        );
      }
      const compId = String(selNode.properties.componentId ?? '');
      const selectedStatus = String(selNode.properties.status ?? '');
      const status = parseVersionStatus(selectedStatus) ?? VersionStatus.Unactive;
      if (!this.introReleaseStatuses.has(status)) {
        throw new BadRequestException(
          'Релиз не выполнен: при добавлении компонента в релиз приложения статус ComponentVersion должен быть active, deprecated или draft',
        );
      }
      if (status === VersionStatus.Draft && row.status !== VersionStatus.Active) {
        throw new BadRequestException(
          'Release failed: draft ComponentVersion rows must use application status active',
        );
      }
      componentIdByCvId.set(row.componentVersionId, compId);
    }
    this.assertAtMostOneActivePerComponent(components, componentIdByCvId);
    await this.validateDraftsLinkedForRelease(
      unitId,
      components.map((c) => c.componentVersionId),
    );
    return { unitId, componentIdByCvId };
  }

  private async validateReleaseSelection(
    dto: ReleaseApplicationDto,
    components: ReleaseComponentSelectionDto[],
  ): Promise<{ unitId: string; componentIdByCvId: Map<string, string> }> {
    const sourceApplicationVersionId = dto.sourceApplicationVersionId?.trim() ?? '';
    if (!sourceApplicationVersionId) {
      throw new BadRequestException(
        'sourceApplicationVersionId is required when application already has versions',
      );
    }
    const unitId = await this.loadUnitId(dto.applicationId);
    if (!unitId) {
      throw new BadRequestException(
        'Release failed: component versions must belong to unit and match the current application version',
      );
    }
    const avOkQuery = `
      MATCH (a:Application {id: $applicationId})
        -[:HAS_VERSION]->(av:ApplicationVersion {id: $sourceApplicationVersionId, status: 'current'})
      RETURN count(av) AS value
    `;
    const avOk = await this.neo4jService.read(avOkQuery, {
      applicationId: dto.applicationId,
      sourceApplicationVersionId,
    });
    if (Number(avOk.records[0]?.get('value') ?? 0) < 1) {
      throw new BadRequestException(
        'Release failed: component versions must belong to unit and match the current application version',
      );
    }
    const componentIdByCvId = new Map<string, string>();
    for (const row of components) {
      const selection = await this.validateOneSelectedRow(
        sourceApplicationVersionId,
        unitId,
        row.componentVersionId,
      );
      if (!selection) {
        throw new BadRequestException(
          'Release failed: component versions must belong to unit and match the current application version',
        );
      }
      if (selection.currentCount > 0 && selection.pathCount === 0) {
        throw new BadRequestException(
          'Релиз не выполнен: каждая выбранная componentVersion должна быть шагом вперёд (или той же нодой) относительно текущего релиза по INHERITED',
        );
      }
      if (selection.currentCount === 0) {
        const status =
          parseVersionStatus(selection.selectedStatus) ?? VersionStatus.Unactive;
        if (!this.introReleaseStatuses.has(status)) {
          throw new BadRequestException(
            'Релиз не выполнен: при добавлении компонента в релиз приложения статус ComponentVersion должен быть active, deprecated или draft',
          );
        }
      }
      if (
        selection.selectedStatus === VersionStatus.Draft &&
        row.status !== VersionStatus.Active
      ) {
        throw new BadRequestException(
          'Release failed: draft ComponentVersion rows must use application status active',
        );
      }
      componentIdByCvId.set(row.componentVersionId, selection.componentId);
    }
    this.assertAtMostOneActivePerComponent(components, componentIdByCvId);
    await this.validateDraftsLinkedForRelease(
      unitId,
      components.map((c) => c.componentVersionId),
    );
    return { unitId, componentIdByCvId };
  }

  private async publishDraftOnRelease(componentVersionId: string, unitId: string): Promise<void> {
    const isDraftQuery = `
      MATCH (cv:ComponentVersion {id: $componentVersionId, unitId: $unitId, status: 'draft'})
      RETURN count(cv) AS value
    `;
    const isDraft = await this.neo4jService.read(isDraftQuery, { componentVersionId, unitId });
    if (Number(isDraft.records[0]?.get('value') ?? 0) === 0) return;
    const query = `
      MATCH (draft:ComponentVersion {id: $componentVersionId, unitId: $unitId, status: 'draft'})
      MATCH (c:Component)-[draftRel:HAS_DRAFT]->(draft)
      SET draft.status = 'active'
      DELETE draftRel
      WITH c, draft
      CREATE (c)-[:HAS_VERSION]->(draft)
    `;
    await this.neo4jService.write(query, { componentVersionId, unitId });
  }

  private async loadCurrentCompositionIds(applicationVersionId: string): Promise<string[]> {
    const query = `
      MATCH (av:ApplicationVersion {id: $applicationVersionId})-[:HAS_COMPONENT]->(cv:ComponentVersion)
      RETURN cv.id AS value
    `;
    const result = await this.neo4jService.read(query, { applicationVersionId });
    return result.records.map((r) => String(r.get('value') ?? '')).filter((x) => x.length > 0);
  }

  private async emitStatusChanges(componentVersionIds: readonly string[]): Promise<void> {
    const changes = await recomputeComponentVersionStatuses(this.neo4jService, componentVersionIds);
    for (const change of changes) {
      this.eventEmitter.emit(componentVersionStatusChangedEvent, {
        componentVersionId: change.componentVersionId,
      });
    }
    for (const id of componentVersionIds) {
      if (changes.some((c) => c.componentVersionId === id)) continue;
      this.eventEmitter.emit(componentVersionStatusChangedEvent, {
        componentVersionId: id,
      });
    }
  }

  async release(dto: ReleaseApplicationDto) {
    const components = normalizeComponents(dto.components);
    if (!dto.applicationId) {
      throw new BadRequestException('applicationId is required');
    }
    if (components.length === 0) {
      throw new BadRequestException('components must not be empty');
    }

    const versionsCount = await this.countApplicationVersions(dto.applicationId);
    const sourceRaw = dto.sourceApplicationVersionId?.trim() ?? '';
    const isFirstRelease = versionsCount === 0;

    if (isFirstRelease) {
      if (sourceRaw.length > 0) {
        throw new BadRequestException(
          'First application release must omit sourceApplicationVersionId',
        );
      }
    } else if (!sourceRaw) {
      throw new BadRequestException(
        'sourceApplicationVersionId is required when application already has versions',
      );
    }

    const validated = isFirstRelease
      ? await this.validateFirstReleaseSelection(dto.applicationId, components)
      : await this.validateReleaseSelection(
          { ...dto, sourceApplicationVersionId: sourceRaw },
          components,
        );

    const unitId = validated.unitId;
    const previousCompositionIds = isFirstRelease
      ? []
      : await this.loadCurrentCompositionIds(sourceRaw);

    const releaseVersionString = await resolveApplicationReleaseVersionString(
      this.neo4jService,
      dto.applicationId,
      isFirstRelease,
      sourceRaw,
      dto.version,
    );

    let newId: string;
    if (isFirstRelease) {
      const nameQuery = `
        MATCH (a:Application {id: $applicationId})
        RETURN a.name AS value
      `;
      const nameRes = await this.neo4jService.read(nameQuery, { applicationId: dto.applicationId });
      const appName = String(nameRes.records[0]?.get('value') ?? '');
      if (!appName) {
        throw new BadRequestException('Release failed: application name missing');
      }
      newId = randomUUID();
      const createFirstQuery = `
        MATCH (app:Application {id: $applicationId})
        CREATE (newAv:ApplicationVersion {
          id: $id,
          applicationId: $applicationId,
          unitId: $unitId,
          versionNumber: 1,
          version: $version,
          status: 'current',
          name: $name,
          type: 'applicationVersion'
        })
        CREATE (app)-[:HAS_VERSION]->(newAv)
        RETURN newAv
      `;
      await this.neo4jService.write(createFirstQuery, {
        applicationId: dto.applicationId,
        id: newId,
        unitId,
        version: releaseVersionString,
        name: appName,
      });
    } else {
      const preQuery = `
        MATCH (a:Application {id: $applicationId})
        OPTIONAL MATCH (a)-[:HAS_VERSION]->(sourceAv:ApplicationVersion {id: $sourceApplicationVersionId, status: 'current'})
        RETURN a.unitId AS unitId, a.name AS appName, sourceAv.versionNumber AS vnum
      `;
      const pre = await this.neo4jService.read(preQuery, {
        applicationId: dto.applicationId,
        sourceApplicationVersionId: sourceRaw,
      });
      const preRow = pre.records[0];
      const appName = String(preRow?.get('appName') ?? '');
      const rawVn = preRow?.get('vnum');
      const vnum = typeof rawVn === 'number' ? rawVn : Number(rawVn ?? null);
      if (!unitId || Number.isNaN(vnum)) {
        throw new BadRequestException(
          'Release failed: source must be current application version and component versions must belong to unit',
        );
      }
      const newVn = vnum + 1;
      newId = randomUUID();
      const createQuery = `
        MATCH (app:Application {id: $applicationId})
          -[:HAS_VERSION]->(currentAv:ApplicationVersion {id: $sourceApplicationVersionId, status: 'current'})
        SET currentAv.status = 'previous'
        CREATE (newAv:ApplicationVersion {
          id: $id,
          applicationId: $applicationId,
          unitId: $unitId,
          versionNumber: $versionNumber,
          version: $version,
          status: 'current',
          name: $name,
          type: 'applicationVersion'
        })
        CREATE (app)-[:HAS_VERSION]->(newAv)
        CREATE (newAv)-[:INHERITED]->(currentAv)
        RETURN newAv
      `;
      await this.neo4jService.write(createQuery, {
        applicationId: dto.applicationId,
        sourceApplicationVersionId: sourceRaw,
        id: newId,
        unitId,
        versionNumber: newVn,
        version: releaseVersionString,
        name: appName,
      });
    }

    for (const row of components) {
      const linkQuery = `
        MATCH (av:ApplicationVersion {id: $applicationVersionId})
        MATCH (cv:ComponentVersion {id: $componentVersionId, unitId: $unitId})
        CREATE (av)-[:HAS_COMPONENT {status: $status}]->(cv)
      `;
      await this.neo4jService.write(linkQuery, {
        applicationVersionId: newId,
        componentVersionId: row.componentVersionId,
        unitId,
        status: row.status,
      });
    }

    const linkedCountQuery = `
      MATCH (av:ApplicationVersion {id: $applicationVersionId})-[:HAS_COMPONENT]->(cv:ComponentVersion)
      WHERE cv.id IN $componentVersionIds
      RETURN count(DISTINCT cv) AS value
    `;
    const componentVersionIds = components.map((c) => c.componentVersionId);
    const linkedCount = await this.neo4jService.read(linkedCountQuery, {
      applicationVersionId: newId,
      componentVersionIds,
    });
    if (Number(linkedCount.records[0]?.get('value') ?? 0) !== componentVersionIds.length) {
      throw new BadRequestException(
        'Release failed: source must be current application version and component versions must belong to unit',
      );
    }

    for (const row of components) {
      await this.publishDraftOnRelease(row.componentVersionId, unitId);
    }

    const recomputeIds = [...new Set([...previousCompositionIds, ...componentVersionIds])];
    await this.emitStatusChanges(recomputeIds);

    const outRead = await this.neo4jService.read(
      `MATCH (av:ApplicationVersion {id: $id}) RETURN av`,
      { id: newId },
    );
    return mapAppVersionRow(requireGraphNode(outRead.records[0].get('value') ?? outRead.records[0].get('av')));
  }

  async revert(dto: RevertApplicationDto) {
    if (!dto.applicationId || !dto.sourceApplicationVersionId) {
      throw new BadRequestException('applicationId and sourceApplicationVersionId are required');
    }
    const resolveQuery = `
      MATCH (a:Application {id: $applicationId})
      OPTIONAL MATCH (a)-[:HAS_VERSION]->(:ApplicationVersion {id: $sourceApplicationVersionId, status: 'current'})
        -[:INHERITED]->(prev:ApplicationVersion {applicationId: $applicationId})
      RETURN prev.id AS prevId, a.unitId AS tid
      LIMIT 1
    `;
    const prevRow = await this.neo4jService.read(resolveQuery, {
      applicationId: dto.applicationId,
      sourceApplicationVersionId: dto.sourceApplicationVersionId,
    });
    const rec = prevRow.records[0];
    const prevId = String(rec?.get('prevId') ?? '');
    const unitId = String(rec?.get('tid') ?? '');
    if (!prevId || !unitId) {
      throw new BadRequestException(
        'Revert failed: source must be current application version with a previous release (INHERITED)',
      );
    }
    const snapQuery = `
      MATCH (prev:ApplicationVersion {id: $prevId, applicationId: $applicationId})
        -[hc:HAS_COMPONENT]->(cv:ComponentVersion {unitId: $unitId})
      RETURN cv.id AS value, hc.status AS status
    `;
    const snap = await this.neo4jService.read(snapQuery, {
      prevId,
      applicationId: dto.applicationId,
      unitId,
    });
    const snapRows = snap.records
      .map((r) => ({
        id: String(r.get('value') ?? ''),
        status: String(r.get('status') ?? VersionStatus.Active),
      }))
      .filter((row) => row.id.length > 0);
    const cvIds = [...new Set(snapRows.map((r) => r.id))];
    if (cvIds.length > 0) {
      const draftQuery = `
        MATCH (cv:ComponentVersion {unitId: $unitId, status: 'draft'})
        WHERE cv.id IN $componentVersionIds
        RETURN cv.id AS value
        LIMIT 1
      `;
      const draftHit = await this.neo4jService.read(draftQuery, {
        unitId,
        componentVersionIds: cvIds,
      });
      if (draftHit.records.length > 0) {
        throw new BadRequestException(
          'Revert failed: previous release snapshot must not reference draft component versions',
        );
      }
    }
    const previousCompositionIds = await this.loadCurrentCompositionIds(
      dto.sourceApplicationVersionId,
    );
    const newId = randomUUID();
    const preQuery = `
      MATCH (a:Application {id: $applicationId})
      OPTIONAL MATCH (a)-[:HAS_VERSION]->(sourceAv:ApplicationVersion {id: $sourceApplicationVersionId, status: 'current'})
      RETURN a.unitId AS unitId, a.name AS appName, sourceAv.versionNumber AS vnum
    `;
    const pre = await this.neo4jService.read(preQuery, {
      applicationId: dto.applicationId,
      sourceApplicationVersionId: dto.sourceApplicationVersionId,
    });
    const preRow = pre.records[0];
    const appName = String(preRow?.get('appName') ?? '');
    const rawVn = preRow?.get('vnum');
    const vnum = typeof rawVn === 'number' ? rawVn : Number(rawVn ?? null);
    if (Number.isNaN(vnum)) {
      throw new BadRequestException('Revert failed: source must be current application version');
    }
    const newVn = vnum + 1;
    const createQuery = `
      MATCH (app:Application {id: $applicationId})
        -[:HAS_VERSION]->(currentAv:ApplicationVersion {id: $sourceApplicationVersionId, status: 'current'})
      SET currentAv.status = 'previous'
      CREATE (newAv:ApplicationVersion {
        id: $id,
        applicationId: $applicationId,
        unitId: $unitId,
        versionNumber: $versionNumber,
        version: $version,
        status: 'current',
        name: $name,
        type: 'applicationVersion'
      })
      CREATE (app)-[:HAS_VERSION]->(newAv)
      CREATE (newAv)-[:INHERITED]->(currentAv)
      RETURN newAv
    `;
    await this.neo4jService.write(createQuery, {
      applicationId: dto.applicationId,
      sourceApplicationVersionId: dto.sourceApplicationVersionId,
      id: newId,
      unitId,
      versionNumber: newVn,
      version: String(newVn),
      name: appName,
    });
    for (const row of snapRows) {
      const status = isApplicationComponentStatus(row.status) ? row.status : VersionStatus.Active;
      const linkQuery = `
        MATCH (av:ApplicationVersion {id: $applicationVersionId})
        MATCH (cv:ComponentVersion {id: $componentVersionId, unitId: $unitId})
        CREATE (av)-[:HAS_COMPONENT {status: $status}]->(cv)
      `;
      await this.neo4jService.write(linkQuery, {
        applicationVersionId: newId,
        componentVersionId: row.id,
        unitId,
        status,
      });
    }
    if (cvIds.length > 0) {
      const linkedRevertQuery = `
        MATCH (av:ApplicationVersion {id: $applicationVersionId})-[:HAS_COMPONENT]->(cv:ComponentVersion)
        WHERE cv.id IN $componentVersionIds
        RETURN count(DISTINCT cv) AS value
      `;
      const linkedRevert = await this.neo4jService.read(linkedRevertQuery, {
        applicationVersionId: newId,
        componentVersionIds: cvIds,
      });
      if (Number(linkedRevert.records[0]?.get('value') ?? 0) !== cvIds.length) {
        throw new BadRequestException(
          'Revert failed: component versions must belong to application unit',
        );
      }
    }
    await this.emitStatusChanges([...new Set([...previousCompositionIds, ...cvIds])]);
    const outRead = await this.neo4jService.read(
      `MATCH (av:ApplicationVersion {id: $id}) RETURN av`,
      { id: newId },
    );
    return mapAppVersionRow(requireGraphNode(outRead.records[0].get('value') ?? outRead.records[0].get('av')));
  }

  private async buildLeavingPreview(
    applicationId: string,
    leavingIds: readonly string[],
  ): Promise<{
    inThisApplication: ReleasePreviewLeavingVersion[];
    stillInOtherApps: Set<string>;
  }> {
    if (leavingIds.length === 0) {
      return { inThisApplication: [], stillInOtherApps: new Set() };
    }
    const stillQuery = `
      MATCH (av:ApplicationVersion {status: 'current'})-[:HAS_COMPONENT]->(cv:ComponentVersion)
      WHERE cv.id IN $ids AND av.applicationId <> $applicationId
      RETURN DISTINCT cv.id AS value
    `;
    const still = await this.neo4jService.read(stillQuery, {
      ids: leavingIds,
      applicationId,
    });
    const stillInOtherApps = new Set(
      still.records.map((r) => String(r.get('value') ?? '')).filter((x) => x.length > 0),
    );

    const detailQuery = `
      UNWIND $ids AS cvId
      MATCH (cv:ComponentVersion {id: cvId})
      OPTIONAL MATCH (c:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      OPTIONAL MATCH (fv:FeatureVersion)-[uses:USES_COMPONENT_VERSION {applicationId: $applicationId}]->(cv)
      OPTIONAL MATCH (feat:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)
      OPTIONAL MATCH (svc:Service)-[agg:AGGREGATES]->(feat)
        WHERE coalesce(agg.deleted, false) = false
      OPTIONAL MATCH (consumer:ComponentVersion)-[depIn:DEPENDS_ON]->(cv)
        WHERE depIn.consumerApplicationId = $applicationId
           OR depIn.providerApplicationId = $applicationId
      OPTIONAL MATCH (cv)-[depOut:DEPENDS_ON]->(provider:ComponentVersion)
        WHERE depOut.consumerApplicationId = $applicationId
           OR depOut.providerApplicationId = $applicationId
      RETURN cv.id AS cvId,
        cv.version AS version,
        coalesce(c.name, cv.name, '') AS componentName,
        collect(DISTINCT CASE WHEN feat IS NOT NULL AND fv IS NOT NULL THEN {
          id: feat.id, name: feat.name, featureVersionId: fv.id, componentVersionId: cv.id
        } END) AS features,
        collect(DISTINCT CASE WHEN svc IS NOT NULL THEN {id: svc.id, name: svc.name} END) AS services,
        collect(DISTINCT CASE WHEN consumer IS NOT NULL THEN {
            fromComponentVersionId: consumer.id,
            toComponentVersionId: cv.id,
            side: 'consumer'
          } END) AS dependsIn,
        collect(DISTINCT CASE WHEN provider IS NOT NULL THEN {
            fromComponentVersionId: cv.id,
            toComponentVersionId: provider.id,
            side: 'provider'
          } END) AS dependsOut
    `;
    const detail = await this.neo4jService.read(detailQuery, {
      ids: leavingIds,
      applicationId,
    });

    const inThisApplication: ReleasePreviewLeavingVersion[] = detail.records.map((record) => {
      const featuresRaw = record.get('features');
      const servicesRaw = record.get('services');
      const dependsIn = record.get('dependsIn');
      const dependsOut = record.get('dependsOut');
      const features = Array.isArray(featuresRaw)
        ? featuresRaw
            .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
            .map((x) => ({
              id: String(x.id ?? ''),
              name: String(x.name ?? ''),
              featureVersionId: String(x.featureVersionId ?? ''),
              componentVersionId: String(x.componentVersionId ?? ''),
            }))
            .filter((x) => x.id.length > 0)
        : [];
      const services = Array.isArray(servicesRaw)
        ? servicesRaw
            .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
            .map((x) => ({ id: String(x.id ?? ''), name: String(x.name ?? '') }))
            .filter((x) => x.id.length > 0)
        : [];
      const dependsOnEdges = [
        ...(Array.isArray(dependsIn) ? dependsIn : []),
        ...(Array.isArray(dependsOut) ? dependsOut : []),
      ]
        .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
        .map((x) => ({
          fromComponentVersionId: String(x.fromComponentVersionId ?? ''),
          toComponentVersionId: String(x.toComponentVersionId ?? ''),
          side: (x.side === 'provider' ? 'provider' : 'consumer') as 'consumer' | 'provider',
        }))
        .filter((x) => x.fromComponentVersionId.length > 0 && x.toComponentVersionId.length > 0);
      return {
        componentVersionId: String(record.get('cvId') ?? ''),
        version: String(record.get('version') ?? ''),
        componentName: String(record.get('componentName') ?? ''),
        features,
        services,
        dependsOnEdges,
      };
    });

    return { inThisApplication, stillInOtherApps };
  }

  private async buildGlobalLeaving(
    leavingIds: readonly string[],
    stillInOtherApps: ReadonlySet<string>,
  ): Promise<ReleasePreviewLeavingVersion[]> {
    const becomingUnactive = leavingIds.filter((id) => !stillInOtherApps.has(id));
    if (becomingUnactive.length === 0) return [];
    const query = `
      UNWIND $ids AS cvId
      MATCH (cv:ComponentVersion {id: cvId})
      OPTIONAL MATCH (c:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      OPTIONAL MATCH (fv:FeatureVersion)-[:USES_COMPONENT_VERSION]->(cv)
      OPTIONAL MATCH (feat:Feature)-[:HAS_VERSION|HAS_DRAFT]->(fv)
      OPTIONAL MATCH (svc:Service)-[agg:AGGREGATES]->(feat)
        WHERE coalesce(agg.deleted, false) = false
      OPTIONAL MATCH (consumer:ComponentVersion)-[:DEPENDS_ON]->(cv)
      OPTIONAL MATCH (cv)-[:DEPENDS_ON]->(provider:ComponentVersion)
      RETURN cv.id AS cvId,
        cv.version AS version,
        coalesce(c.name, cv.name, '') AS componentName,
        collect(DISTINCT CASE WHEN feat IS NOT NULL AND fv IS NOT NULL THEN {
          id: feat.id, name: feat.name, featureVersionId: fv.id, componentVersionId: cv.id
        } END) AS features,
        collect(DISTINCT CASE WHEN svc IS NOT NULL THEN {id: svc.id, name: svc.name} END) AS services,
        collect(DISTINCT CASE WHEN consumer IS NOT NULL THEN {
          fromComponentVersionId: consumer.id, toComponentVersionId: cv.id, side: 'consumer'
        } END) AS dependsIn,
        collect(DISTINCT CASE WHEN provider IS NOT NULL THEN {
          fromComponentVersionId: cv.id, toComponentVersionId: provider.id, side: 'provider'
        } END) AS dependsOut
    `;
    const result = await this.neo4jService.read(query, { ids: becomingUnactive });
    return result.records.map((record) => {
      const featuresRaw = record.get('features');
      const servicesRaw = record.get('services');
      const dependsIn = record.get('dependsIn');
      const dependsOut = record.get('dependsOut');
      return {
        componentVersionId: String(record.get('cvId') ?? ''),
        version: String(record.get('version') ?? ''),
        componentName: String(record.get('componentName') ?? ''),
        features: Array.isArray(featuresRaw)
          ? featuresRaw
              .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
              .map((x) => ({
                id: String(x.id ?? ''),
                name: String(x.name ?? ''),
                featureVersionId: String(x.featureVersionId ?? ''),
                componentVersionId: String(x.componentVersionId ?? ''),
              }))
              .filter((x) => x.id.length > 0)
          : [],
        services: Array.isArray(servicesRaw)
          ? servicesRaw
              .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
              .map((x) => ({ id: String(x.id ?? ''), name: String(x.name ?? '') }))
              .filter((x) => x.id.length > 0)
          : [],
        dependsOnEdges: [
          ...(Array.isArray(dependsIn) ? dependsIn : []),
          ...(Array.isArray(dependsOut) ? dependsOut : []),
        ]
          .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
          .map((x) => ({
            fromComponentVersionId: String(x.fromComponentVersionId ?? ''),
            toComponentVersionId: String(x.toComponentVersionId ?? ''),
            side: (x.side === 'provider' ? 'provider' : 'consumer') as 'consumer' | 'provider',
          }))
          .filter((x) => x.fromComponentVersionId.length > 0),
      };
    });
  }

  async releasePreview(dto: ReleasePreviewDto): Promise<ReleasePreviewResponse> {
    if (!dto.applicationId) {
      throw new BadRequestException('applicationId is required');
    }
    if (dto.mode !== ReleasePreviewMode.Release && dto.mode !== ReleasePreviewMode.Revert) {
      throw new BadRequestException('mode must be release or revert');
    }

    let currentIds: string[] = [];
    let nextIds: string[] = [];
    let nextStatuses = new Map<string, ApplicationComponentStatus>();
    const sourceId = dto.sourceApplicationVersionId?.trim() ?? '';

    if (dto.mode === ReleasePreviewMode.Release) {
      const components = normalizeComponents(dto.components);
      if (components.length === 0) {
        throw new BadRequestException('components must not be empty for release preview');
      }
      nextIds = components.map((c) => c.componentVersionId);
      nextStatuses = new Map(components.map((c) => [c.componentVersionId, c.status]));
      if (sourceId) {
        currentIds = await this.loadCurrentCompositionIds(sourceId);
      }
    } else {
      if (!sourceId) {
        throw new BadRequestException('sourceApplicationVersionId is required for revert preview');
      }
      currentIds = await this.loadCurrentCompositionIds(sourceId);
      const resolveQuery = `
        MATCH (:Application {id: $applicationId})-[:HAS_VERSION]->(:ApplicationVersion {id: $sourceId, status: 'current'})
          -[:INHERITED]->(prev:ApplicationVersion)
        MATCH (prev)-[hc:HAS_COMPONENT]->(cv:ComponentVersion)
        RETURN cv.id AS id, hc.status AS status
      `;
      const snap = await this.neo4jService.read(resolveQuery, {
        applicationId: dto.applicationId,
        sourceId,
      });
      nextIds = snap.records.map((r) => String(r.get('id') ?? '')).filter((x) => x.length > 0);
      nextStatuses = new Map(
        snap.records
          .map((r) => {
            const id = String(r.get('id') ?? '');
            const status = String(r.get('status') ?? '');
            return [id, status] as const;
          })
          .filter(
            (pair): pair is readonly [string, ApplicationComponentStatus] =>
              pair[0].length > 0 && isApplicationComponentStatus(pair[1]),
          ),
      );
    }

    const leavingIds = currentIds.filter((id) => !nextIds.includes(id));
    const { inThisApplication, stillInOtherApps } = await this.buildLeavingPreview(
      dto.applicationId,
      leavingIds,
    );
    const global = await this.buildGlobalLeaving(leavingIds, stillInOtherApps);

    const statusQuery = `
      UNWIND $ids AS cvId
      MATCH (cv:ComponentVersion {id: cvId})
      OPTIONAL MATCH (c:Component)-[:HAS_VERSION|HAS_DRAFT]->(cv)
      RETURN cv.id AS id, cv.version AS version, cv.status AS status,
        coalesce(c.name, cv.name, '') AS componentName
    `;
    const affectedIds = [...new Set([...currentIds, ...nextIds])];
    const statusRows = await this.neo4jService.read(statusQuery, { ids: affectedIds });
    const globalStatusChanges = statusRows.records
      .map((record) => {
        const id = String(record.get('id') ?? '');
        const fromStatus =
          parseVersionStatus(record.get('status')) ?? VersionStatus.Unactive;
        const staysInNext = nextIds.includes(id);
        const edgeStatus = nextStatuses.get(id);
        let toStatus = fromStatus;
        if (fromStatus === VersionStatus.Draft && staysInNext) {
          toStatus = VersionStatus.Active;
        } else if (!staysInNext && !stillInOtherApps.has(id) && leavingIds.includes(id)) {
          toStatus = VersionStatus.Unactive;
        } else if (staysInNext && edgeStatus === VersionStatus.Active) {
          toStatus = VersionStatus.Active;
        } else if (staysInNext && edgeStatus === VersionStatus.Deprecated) {
          toStatus =
            stillInOtherApps.has(id) || currentIds.includes(id)
              ? fromStatus === VersionStatus.Active
                ? VersionStatus.Active
                : VersionStatus.Deprecated
              : VersionStatus.Deprecated;
        }
        if (toStatus === fromStatus) return null;
        return {
          componentVersionId: id,
          version: String(record.get('version') ?? ''),
          componentName: String(record.get('componentName') ?? ''),
          fromStatus,
          toStatus,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return { inThisApplication, global, globalStatusChanges };
  }
}
