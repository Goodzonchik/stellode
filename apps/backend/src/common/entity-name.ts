import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Neo4jService } from '../neo4j/neo4j.service';

type EntityLabel = 'Unit' | 'Team' | 'Application' | 'Service' | 'Feature' | 'Component';

type UniqueCheckArgs = {
  readonly neo4jService: Neo4jService;
  readonly label: EntityLabel;
  readonly name: string;
  readonly excludeId?: string;
};

type UnitScopedUniqueCheckArgs = UniqueCheckArgs & {
  readonly unitId: string;
};

const hasDuplicate = async (
  neo4jService: Neo4jService,
  query: string,
  params: Record<string, unknown>,
): Promise<boolean> => {
  const result = await neo4jService.read(query, params);
  const firstRecord = result.records[0];
  if (!firstRecord) return false;
  const exists = firstRecord.get('exists');
  return Boolean(exists);
};

const hasMeaningfulExcludeId = (excludeId: string | undefined): excludeId is string =>
  excludeId !== undefined && excludeId.length > 0;

export const normalizeEntityName = (name: string): string => {
  const normalized = name.trim();

  if (!normalized) {
    throw new BadRequestException('Name must not be empty');
  }

  return normalized;
};

export const assertNameImmutable = (name: string | undefined, entity: string): void => {
  if (name !== undefined) {
    throw new BadRequestException(`${entity} name is immutable`);
  }
};

type AssertNameUnchangedThenUniqueBase = {
  readonly neo4jService: Neo4jService;
  readonly label: EntityLabel;
  readonly entityId: string;
  readonly name: string;
  readonly storedName: string;
};

type AssertNameUnchangedThenUniqueArgs =
  | (AssertNameUnchangedThenUniqueBase & { readonly scope: 'global' })
  | (AssertNameUnchangedThenUniqueBase & { readonly scope: 'unit'; readonly unitId: string });

export const assertNameUnchangedThenUnique = async (
  args: AssertNameUnchangedThenUniqueArgs,
): Promise<void> => {
  const normalized = normalizeEntityName(args.name);
  if (normalized !== normalizeEntityName(args.storedName)) {
    throw new BadRequestException(`${args.label} name is immutable`);
  }
  if (args.scope === 'global') {
    await assertGlobalNameUnique({
      neo4jService: args.neo4jService,
      label: args.label,
      name: normalized,
      excludeId: args.entityId,
    });
    return;
  }
  await assertUnitScopedNameUnique({
    neo4jService: args.neo4jService,
    label: args.label,
    unitId: args.unitId,
    name: normalized,
    excludeId: args.entityId,
  });
};

export const assertGlobalNameUnique = async ({
  neo4jService,
  label,
  name,
  excludeId,
}: UniqueCheckArgs): Promise<void> => {
  const normalizedName = normalizeEntityName(name).toLowerCase();
  const withExclude = hasMeaningfulExcludeId(excludeId);
  const query = withExclude
    ? `
    MATCH (n:${label})
    WHERE toLower(n.name) = $normalizedName AND n.id <> $excludeId
    RETURN count(n) > 0 AS exists
  `
    : `
    MATCH (n:${label})
    WHERE toLower(n.name) = $normalizedName
    RETURN count(n) > 0 AS exists
  `;
  const params: Record<string, unknown> = withExclude
    ? { normalizedName, excludeId }
    : { normalizedName };
  const exists = await hasDuplicate(neo4jService, query, params);
  if (exists) {
    throw new ConflictException(`${label} with this name already exists`);
  }
};

export const assertUnitScopedNameUnique = async ({
  neo4jService,
  label,
  unitId,
  name,
  excludeId,
}: UnitScopedUniqueCheckArgs): Promise<void> => {
  const normalizedName = normalizeEntityName(name).toLowerCase();
  const withExclude = hasMeaningfulExcludeId(excludeId);
  const query = withExclude
    ? `
    MATCH (n:${label} {unitId: $unitId})
    WHERE toLower(n.name) = $normalizedName AND n.id <> $excludeId
    RETURN count(n) > 0 AS exists
  `
    : `
    MATCH (n:${label} {unitId: $unitId})
    WHERE toLower(n.name) = $normalizedName
    RETURN count(n) > 0 AS exists
  `;
  const params: Record<string, unknown> = withExclude
    ? { unitId, normalizedName, excludeId }
    : { unitId, normalizedName };
  const exists = await hasDuplicate(neo4jService, query, params);
  if (exists) {
    throw new ConflictException(`${label} with this name already exists`);
  }
};
