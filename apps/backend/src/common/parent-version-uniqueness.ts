import { ConflictException } from '@nestjs/common';
import {
  suggestNextApplicationVersionString,
  suggestNextComponentOrFeatureVersionString,
} from '@stellode/models';
import { Neo4jService } from '../neo4j/neo4j.service';

type VersionedParentLabel = 'Component' | 'Feature' | 'Application';

const versionNodeLabel = (parent: VersionedParentLabel): string => `${parent}Version`;

export const normalizeOptionalVersion = (version: string | undefined): string | undefined => {
  if (version === undefined) {
    return undefined;
  }
  const trimmed = version.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readMaxVersionNumber = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  const num = typeof raw === 'number' ? raw : Number(raw);
  return Number.isNaN(num) ? null : num;
};

export const resolveComponentOrFeatureVersionString = async (
  neo4jService: Neo4jService,
  parentLabel: 'Component' | 'Feature',
  parentBusinessId: string,
  requestedVersion: string | undefined,
): Promise<string> => {
  const query = `
    MATCH (parent:${parentLabel} {id: $parentId})-[:HAS_DRAFT|HAS_VERSION]->(v:${versionNodeLabel(parentLabel)})
    RETURN max(v.versionNumber) AS value
  `;
  const result = await neo4jService.read(query, { parentId: parentBusinessId });
  const maxNum = readMaxVersionNumber(result.records[0]?.get('value'));
  const version = normalizeOptionalVersion(requestedVersion) ?? suggestNextComponentOrFeatureVersionString(maxNum);
  await assertVersionUniqueWithinParent(neo4jService, parentLabel, parentBusinessId, version);
  return version;
};

export const resolveApplicationReleaseVersionString = async (
  neo4jService: Neo4jService,
  applicationId: string,
  isFirstRelease: boolean,
  sourceApplicationVersionId: string,
  requestedVersion: string | undefined,
): Promise<string> => {
  if (isFirstRelease) {
    const version =
      normalizeOptionalVersion(requestedVersion) ?? suggestNextApplicationVersionString(null);
    await assertVersionUniqueWithinParent(neo4jService, 'Application', applicationId, version);
    return version;
  }
  const query = `
    MATCH (a:Application {id: $applicationId})-[:HAS_VERSION]->(av:ApplicationVersion {id: $sourceId, status: 'current'})
    RETURN av.versionNumber AS value
  `;
  const result = await neo4jService.read(query, {
    applicationId,
    sourceId: sourceApplicationVersionId,
  });
  const currentNum = readMaxVersionNumber(result.records[0]?.get('value'));
  const version =
    normalizeOptionalVersion(requestedVersion) ?? suggestNextApplicationVersionString(currentNum);
  await assertVersionUniqueWithinParent(neo4jService, 'Application', applicationId, version);
  return version;
};

export const assertVersionUniqueWithinParent = async (
  neo4jService: Neo4jService,
  parentLabel: VersionedParentLabel,
  parentBusinessId: string,
  version: string,
): Promise<void> => {
  const query = `
    MATCH (parent:${parentLabel} {id: $parentId})-[:HAS_DRAFT|HAS_VERSION]->(v:${versionNodeLabel(parentLabel)})
    WHERE v.version = $version
    RETURN count(v) AS value
  `;
  const result = await neo4jService.read(query, { parentId: parentBusinessId, version });
  const count = Number(result.records[0]?.get('value') ?? 0);
  if (count > 0) {
    throw new ConflictException(
      `${versionNodeLabel(parentLabel)} with this version already exists for the parent ${parentLabel}`,
    );
  }
};
