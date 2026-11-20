import { BadRequestException, Injectable } from '@nestjs/common';
import { Neo4jService, type GraphNode } from '../neo4j/neo4j.service';
import {
  dependsOnContextProps,
  dependsOnMatchKeysWhere,
} from '../common/depends-on-context-props';
import {
  assertContextSideComplete,
  buildDependsOnStatusWarnings,
  contextHasBusinessKeys,
} from './edge-context-validation';
import type {
  CreateDependsOnFromFeatureVersionsDto,
  CreateEdgeDto,
  CreateEdgeResponseDto,
  DeleteDependsOnFromFeatureVersionsDto,
  DependsOnContextDto,
} from '@stellode/models';

@Injectable()
export class EdgeService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async createDependsOnFromFeatureVersions(
    dto: CreateDependsOnFromFeatureVersionsDto,
  ): Promise<CreateEdgeResponseDto> {
    const context = await this.#dependsOnContextForCrossFeatureVersions(dto);
    return this.create({
      source: dto.sourceComponentVersionId,
      target: dto.targetComponentVersionId,
      context,
    });
  }

  async deleteDependsOnFromFeatureVersions(
    dto: DeleteDependsOnFromFeatureVersionsDto,
  ): Promise<void> {
    const status = await this.#featureVersionStatus(dto.consumerFeatureVersionId);
    if (status === null) {
      throw new BadRequestException('FeatureVersion not found');
    }
    if (status !== 'draft') {
      throw new BadRequestException('DEPENDS_ON can be deleted only for FeatureVersion(draft)');
    }

    const matchParams = {
      sourceId: dto.sourceComponentVersionId,
      targetId: dto.targetComponentVersionId,
      consumerFeatureVersionId: dto.consumerFeatureVersionId,
      consumerApplicationId: dto.consumerApplicationId.trim(),
      providerApplicationId: dto.providerApplicationId.trim(),
    };
    const matchWhere = `
      MATCH (source:ComponentVersion {id: $sourceId})-[r:DEPENDS_ON]->(target:ComponentVersion {id: $targetId})
      WHERE ${dependsOnMatchKeysWhere('r')}
    `;
    const countResult = await this.neo4jService.read(
      `${matchWhere}
      RETURN count(r) AS value`,
      matchParams,
    );
    const matched = Number(countResult.records[0]?.get('value') ?? 0);
    if (matched < 1) {
      throw new BadRequestException('DEPENDS_ON not found for the given FeatureVersion context');
    }

    await this.neo4jService.write(
      `${matchWhere}
      DELETE r`,
      matchParams,
    );
  }

  async create(dto: CreateEdgeDto): Promise<CreateEdgeResponseDto> {
    assertContextSideComplete(
      [
        dto.context?.consumerServiceId,
        dto.context?.consumerApplicationId,
        dto.context?.consumerFeatureId,
        dto.context?.consumerFeatureVersionId,
      ],
      'consumer',
    );
    assertContextSideComplete(
      [
        dto.context?.providerServiceId,
        dto.context?.providerApplicationId,
        dto.context?.providerFeatureId,
        dto.context?.providerFeatureVersionId,
      ],
      'provider',
    );

    const checkQuery = `
      MATCH (source:ComponentVersion {id: $source})
      MATCH (target:ComponentVersion {id: $target})
      RETURN source, target
    `;
    const check = await this.neo4jService.read(checkQuery, {
      source: dto.source,
      target: dto.target,
    });
    if (check.records.length === 0) {
      throw new BadRequestException('DEPENDS_ON requires two existing ComponentVersion nodes');
    }

    const source = check.records[0].get('source') as GraphNode;
    const target = check.records[0].get('target') as GraphNode;

    const sourceUnitId = source.properties.unitId as string | undefined;
    const targetUnitId = target.properties.unitId as string | undefined;
    const isCrossUnit =
      Boolean(sourceUnitId) && Boolean(targetUnitId) && sourceUnitId !== targetUnitId;

    if (isCrossUnit) {
      const isPublic = Boolean(target.properties.isPublic);
      if (!isPublic) {
        throw new BadRequestException('Cross-unit DEPENDS_ON requires isPublic on target version');
      }
      if (!contextHasBusinessKeys(dto.context)) {
        throw new BadRequestException(
          'Для cross-unit DEPENDS_ON нужен непустой контекст (идентификаторы Service/Application/Feature)',
        );
      }
    }

    const sourceStatus = source.properties.status ?? source.properties.state;
    const targetStatus = target.properties.status ?? target.properties.state;
    if (targetStatus === 'unactive') {
      throw new BadRequestException(
        'Цель DEPENDS_ON не может быть unactive; новые связи на unactive запрещены',
      );
    }

    if (targetStatus === 'deprecated') {
      const inheritedQuery = `
        MATCH (:ComponentVersion {id: $source})-[:INHERITED]->(:ComponentVersion)
              -[:DEPENDS_ON]->(target:ComponentVersion {id: $target})
        RETURN count(target) AS value
      `;
      const inheritedResult = await this.neo4jService.read(inheritedQuery, {
        source: dto.source,
        target: dto.target,
      });
      const inherited = Number(inheritedResult.records[0]?.get('value') ?? 0) > 0;
      const providerFv =
        dto.context?.providerFeatureVersionId !== undefined &&
        dto.context.providerFeatureVersionId.trim().length > 0
          ? dto.context.providerFeatureVersionId.trim()
          : null;
      const providerApplicationId =
        dto.context?.providerApplicationId !== undefined &&
        dto.context.providerApplicationId.trim().length > 0
          ? dto.context.providerApplicationId.trim()
          : undefined;
      const inCompose =
        providerFv !== null
          ? await this.#componentVersionInFeatureVersionCompose(
              providerFv,
              dto.target,
              providerApplicationId,
            )
          : false;
      if (!inherited && !inCompose) {
        throw new BadRequestException(
          'DEPENDS_ON на deprecated допускается только по линии INHERITED или при включении в заявленную FeatureVersion поставщика',
        );
      }
    }

    const props = dependsOnContextProps(dto.context ?? {});
    const writeQuery = `
      MATCH (from:ComponentVersion {id: $source})
      MATCH (to:ComponentVersion {id: $target})
      WHERE from <> to
      CREATE (from)-[:DEPENDS_ON $props]->(to)
    `;

    await this.neo4jService.write(writeQuery, {
      source: dto.source,
      target: dto.target,
      props,
    });

    return {
      source: dto.source,
      target: dto.target,
      warnings: buildDependsOnStatusWarnings(sourceStatus, targetStatus),
    };
  }

  async #dependsOnContextForCrossFeatureVersions(
    dto: CreateDependsOnFromFeatureVersionsDto,
  ): Promise<DependsOnContextDto> {
    const consumerFeat = await this.#featureElementIdForFeatureVersion(dto.consumerFeatureVersionId);
    const providerFeat = await this.#featureElementIdForFeatureVersion(dto.providerFeatureVersionId);
    if (!consumerFeat) {
      throw new BadRequestException('Consumer FeatureVersion has no parent Feature');
    }
    if (!providerFeat) {
      throw new BadRequestException('Provider FeatureVersion has no parent Feature');
    }
    const consumerService = await this.#firstServiceAggregatingFeature(consumerFeat);
    const providerService = await this.#firstServiceAggregatingFeature(providerFeat);
    if (!consumerService || !providerService) {
      throw new BadRequestException(
        'No active Service aggregates Feature for consumer or provider (AGGREGATES not deleted)',
      );
    }
    const consumerApplicationId = dto.consumerApplicationId.trim();
    const providerApplicationId = dto.providerApplicationId.trim();
    return {
      consumerServiceId: consumerService,
      consumerApplicationId,
      consumerFeatureId: consumerFeat,
      consumerFeatureVersionId: dto.consumerFeatureVersionId,
      providerServiceId: providerService,
      providerApplicationId,
      providerFeatureId: providerFeat,
      providerFeatureVersionId: dto.providerFeatureVersionId,
    };
  }

  async #featureElementIdForFeatureVersion(featureVersionId: string): Promise<string | null> {
    const query = `
      MATCH (feature:Feature)-[:HAS_VERSION|HAS_DRAFT]->(:FeatureVersion {id: $featureVersionId})
      RETURN feature.id AS value
      LIMIT 1
    `;
    return this.#readGraphScalar(query, { featureVersionId });
  }

  async #featureVersionStatus(featureVersionId: string): Promise<string | null> {
    const query = `
      MATCH (fv:FeatureVersion {id: $featureVersionId})
      RETURN coalesce(fv.status, fv.state) AS value
      LIMIT 1
    `;
    return this.#readGraphScalar(query, { featureVersionId });
  }

  async #firstServiceAggregatingFeature(featureElementId: string): Promise<string | null> {
    const query = `
      MATCH (service:Service)-[aggregates:AGGREGATES]->(:Feature {id: $featureId})
      WHERE aggregates.deleted IS NULL OR aggregates.deleted = false
      RETURN service.id AS value
      LIMIT 1
    `;
    return this.#readGraphScalar(query, { featureId: featureElementId });
  }

  async #componentVersionInFeatureVersionCompose(
    featureVersionBizId: string,
    componentVersionBizId: string,
    applicationId?: string,
  ): Promise<boolean> {
    const query =
      applicationId !== undefined && applicationId.trim().length > 0
        ? `
      MATCH (:FeatureVersion {id: $featureVersionId})
        -[:USES_COMPONENT_VERSION {applicationId: $applicationId}]->
            (cv:ComponentVersion {id: $componentVersionId})
      RETURN cv
      LIMIT 1
    `
        : `
      MATCH (:FeatureVersion {id: $featureVersionId})-[:USES_COMPONENT_VERSION]->
            (cv:ComponentVersion {id: $componentVersionId})
      RETURN cv
      LIMIT 1
    `;
    const result = await this.neo4jService.read(query, {
      featureVersionId: featureVersionBizId,
      componentVersionId: componentVersionBizId,
      ...(applicationId !== undefined && applicationId.trim().length > 0
        ? { applicationId: applicationId.trim() }
        : {}),
    });
    return result.records.length > 0;
  }

  async #readGraphScalar(
    query: string,
    parameters: Record<string, unknown>,
  ): Promise<string | null> {
    const result = await this.neo4jService.read(query, parameters);
    const record = result.records[0];
    if (!record) return null;
    const value = record.get('value') ?? record.get('id');
    if (typeof value === 'string' && value.length > 0) return value;
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return String(value).trim();
    }
    return null;
  }
}
