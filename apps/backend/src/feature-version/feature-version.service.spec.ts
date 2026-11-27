import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ComponentVersionService } from '../component-version/component-version.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { FeatureVersionService } from './feature-version.service';
import {
  FeatureBindingReadinessReason,
  FeatureVersionReadinessReason,
  VersionStatus,
} from '@stellode/models';

const mkFvNode = (props: Record<string, unknown>) => ({
  id: String(props.id ?? 'fv1'),
  label: 'FeatureVersion' as const,
  properties: { status: 'active', id: String(props.id ?? 'fv1'), ...props },
});

const mkRecord = (data: Record<string, unknown>) => ({
  get: (key: string) => data[key],
});

const mkBindingRow = (overrides: Record<string, unknown> = {}) => ({
  applicationId: 'app-1',
  applicationName: 'App One',
  componentId: 'cmp-1',
  componentName: 'Cmp One',
  componentVersionId: 'cv-1',
  componentVersion: '1.0.0',
  unitId: 'unit-1',
  hasCurrentRelease: true,
  statusInRelease: 'active',
  ...overrides,
});

const idsFromParams = (params?: Record<string, unknown>): string[] => {
  if (Array.isArray(params?.ids)) {
    return params.ids.filter((id): id is string => typeof id === 'string');
  }
  if (typeof params?.featureVersionId === 'string') {
    return [params.featureVersionId];
  }
  return [];
};

const isMutatingCypher = (query: string): boolean =>
  /\b(CREATE|MERGE|DELETE|SET|REMOVE)\b/i.test(query);

const createService = async (
  read: jest.Mock,
  write: jest.Mock = jest.fn(),
  extras: {
    componentVersionService?: Partial<ComponentVersionService>;
  } = {},
) => {
  const writeInTransaction = jest.fn(
    async <T>(work: (run: typeof read) => Promise<T>): Promise<T> =>
      work(async (query: string, parameters?: Record<string, unknown>) => {
        if (isMutatingCypher(query)) {
          return write(query, parameters);
        }
        return read(query, parameters);
      }),
  );
  const moduleRef = await Test.createTestingModule({
    providers: [
      FeatureVersionService,
      { provide: Neo4jService, useValue: { read, write, writeInTransaction } },
      {
        provide: ComponentVersionService,
        useValue: extras.componentVersionService ?? { create: jest.fn() },
      },
    ],
  }).compile();
  return moduleRef.get(FeatureVersionService);
};

describe('FeatureVersionService', () => {
  describe('getFeatureVersionsByFeatureElementId', () => {
    it('returns versions sorted as draft, active, unactive and by version desc', async () => {
      const versions = [
        mkFvNode({ id: 'u2', status: 'unactive', versionNumber: 9, version: '9' }),
        mkFvNode({ id: 'd1', status: 'draft', versionNumber: 1, version: '1' }),
        mkFvNode({ id: 'a2', status: 'active', versionNumber: 8, version: '8' }),
        mkFvNode({ id: 'd2', status: 'draft', versionNumber: 3, version: '3' }),
        mkFvNode({ id: 'a1', status: 'active', versionNumber: 10, version: '10' }),
        mkFvNode({ id: 'u1', status: 'unactive', versionNumber: 11, version: '11' }),
      ];

      const read = jest
        .fn()
        .mockImplementation(async (query: string, params?: Record<string, unknown>) => {
          if (query.includes('AS featureVersion')) {
            return {
              records: versions.map((featureVersion) =>
                mkRecord({
                  featureVersion,
                  services: [],
                  componentVersions: [],
                  componentCount: 0,
                  teamCount: 0,
                  inheritedFromId: featureVersion.id === 'd2' ? 'a1' : null,
                }),
              ),
            };
          }
          if (query.includes('AS bindingRows')) {
            const ids = idsFromParams(params);
            return {
              records: ids.map((id) => {
                const matched = versions.find((item) => item.id === id);
                return mkRecord({
                  id,
                  status: matched?.properties.status ?? 'unactive',
                  canAutoActive: false,
                  bindingRows: [],
                });
              }),
            };
          }
          if (query.includes('AS crossUnitBindingRows')) {
            const ids = idsFromParams(params);
            return {
              records: ids.map((id) => mkRecord({ id, crossUnitBindingRows: [] })),
            };
          }
          return { records: [] };
        });
      const write = jest.fn();

      const service = await createService(read, write);
      const result = await service.getFeatureVersionsByFeatureElementId('feature-id');

      expect(read).toHaveBeenCalledWith(
        expect.stringContaining('AS featureVersion'),
        expect.objectContaining({ featureElementId: 'feature-id' }),
      );
      expect(read).toHaveBeenCalledWith(
        expect.stringContaining('INHERITED'),
        expect.any(Object),
      );
      const readinessReads = read.mock.calls.filter(
        (call) =>
          String(call[0]).includes('AS bindingRows') ||
          String(call[0]).includes('AS crossUnitBindingRows'),
      );
      expect(readinessReads).toHaveLength(2);
      expect(readinessReads[0][1]).toEqual(
        expect.objectContaining({ ids: expect.arrayContaining(['d1', 'd2', 'a1']) }),
      );
      expect(result.map((item) => item.id)).toEqual(['d2', 'd1', 'a1', 'a2', 'u1', 'u2']);
      expect(result.every((item) => item.componentCount === 0 && item.teamCount === 0)).toBe(true);
      expect(result.find((item) => item.id === 'd2')?.inheritedFromId).toBe('a1');
      expect(result.find((item) => item.id === 'a1')?.inheritedFromId).toBeNull();
      expect(result.find((item) => item.id === 'd1')?.readyToProduction).toBe(false);
      expect(result.find((item) => item.id === 'a1')?.readyToProduction).toBe(false);
    });

    it('returns distinct componentVersion and team counts from relations query', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', versionNumber: 1, version: '1' });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS featureVersion')) {
          return {
            records: [
              mkRecord({
                featureVersion: fv,
                services: [],
                componentVersions: [
                  {
                    id: 'cv-1',
                    name: 'Cmp',
                    version: '1.0.0',
                    status: 'active',
                    componentId: 'cmp-1',
                  },
                  {
                    id: 'cv-2',
                    name: 'Cmp2',
                    version: '2.0.0',
                    status: 'active',
                    componentId: 'cmp-2',
                  },
                ],
                componentCount: 2,
                teamCount: 3,
                inheritedFromId: null,
              }),
            ],
          };
        }
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [],
              }),
            ],
          };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.getFeatureVersionsByFeatureElementId('feature-id');

      expect(result).toHaveLength(1);
      expect(result[0].componentCount).toBe(2);
      expect(result[0].teamCount).toBe(3);
      expect(result[0].inheritedFromId).toBeNull();
      expect(read).toHaveBeenCalledWith(
        expect.stringContaining('count(DISTINCT cv.id) AS componentCount'),
        expect.any(Object),
      );
      expect(read).toHaveBeenCalledWith(
        expect.stringContaining('count(DISTINCT team.id) AS teamCount'),
        expect.any(Object),
      );
    });

    it('loads readyToProduction for many versions with two readiness reads', async () => {
      const versions = [
        mkFvNode({ id: 'd1', status: 'draft', versionNumber: 1, version: '1' }),
        mkFvNode({ id: 'd2', status: 'draft', versionNumber: 2, version: '2' }),
        mkFvNode({ id: 'a1', status: 'active', versionNumber: 3, version: '3' }),
      ];
      const read = jest
        .fn()
        .mockImplementation(async (query: string, params?: Record<string, unknown>) => {
          if (query.includes('AS featureVersion')) {
            return {
              records: versions.map((featureVersion) =>
                mkRecord({
                  featureVersion,
                  services: [],
                  componentVersions: [],
                  componentCount: 0,
                  teamCount: 0,
                  inheritedFromId: null,
                }),
              ),
            };
          }
          if (query.includes('AS bindingRows')) {
            const ids = idsFromParams(params);
            return {
              records: ids.map((id) =>
                mkRecord({
                  id,
                  status: versions.find((item) => item.id === id)?.properties.status ?? 'draft',
                  canAutoActive: false,
                  bindingRows: id.startsWith('d') ? [mkBindingRow()] : [],
                }),
              ),
            };
          }
          if (query.includes('AS crossUnitBindingRows')) {
            return {
              records: idsFromParams(params).map((id) =>
                mkRecord({ id, crossUnitBindingRows: [] }),
              ),
            };
          }
          return { records: [] };
        });

      const service = await createService(read);
      const result = await service.getFeatureVersionsByFeatureElementId('feature-id');

      const readinessReads = read.mock.calls.filter(
        (call) =>
          String(call[0]).includes('AS bindingRows') ||
          String(call[0]).includes('AS crossUnitBindingRows'),
      );
      expect(readinessReads).toHaveLength(2);
      expect(result.find((item) => item.id === 'd1')?.readyToProduction).toBe(true);
      expect(result.find((item) => item.id === 'd2')?.readyToProduction).toBe(true);
      expect(result.find((item) => item.id === 'a1')?.readyToProduction).toBe(false);
    });
  });

  describe('handleComponentVersionStatusChanged', () => {
    it('batches readiness and publishes only ready auto-active drafts', async () => {
      const read = jest
        .fn()
        .mockImplementation(async (query: string, params?: Record<string, unknown>) => {
          if (
            query.includes("status: 'draft'") &&
            query.includes('USES_COMPONENT_VERSION') &&
            query.includes('RETURN DISTINCT fv.id')
          ) {
            return {
              records: [mkRecord({ value: 'fv-ready' }), mkRecord({ value: 'fv-skip' })],
            };
          }
          if (query.includes('AS bindingRows')) {
            const ids = idsFromParams(params);
            return {
              records: ids.map((id) =>
                mkRecord({
                  id,
                  status: 'draft',
                  canAutoActive: id === 'fv-ready',
                  bindingRows: id === 'fv-ready' ? [mkBindingRow()] : [],
                }),
              ),
            };
          }
          if (query.includes('AS crossUnitBindingRows')) {
            return {
              records: idsFromParams(params).map((id) =>
                mkRecord({ id, crossUnitBindingRows: [] }),
              ),
            };
          }
          if (query.includes('usesAppIds')) {
            return {
              records: [mkRecord({ usesAppIds: ['app-1'], providerAppIds: [] })],
            };
          }
          if (query.includes('PINNED') || query.includes('applicationVersionId')) {
            return {
              records: [mkRecord({ applicationId: 'app-1', applicationVersionId: 'av-1' })],
            };
          }
          return { records: [] };
        });
      const write = jest.fn().mockResolvedValue({
        records: [mkRecord({ draft: mkFvNode({ id: 'fv-ready', status: 'active' }) })],
      });
      const service = await createService(read, write);
      const publishSpy = jest.spyOn(service, 'publish');

      await service.handleComponentVersionStatusChanged({ componentVersionId: 'cv-1' });

      const batchReadsBeforePublish = read.mock.calls
        .slice(0, 3)
        .map((call) => String(call[0]));
      expect(batchReadsBeforePublish[0]).toContain('RETURN DISTINCT fv.id');
      expect(batchReadsBeforePublish[1]).toContain('AS bindingRows');
      expect(batchReadsBeforePublish[2]).toContain('AS crossUnitBindingRows');
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith({ featureVersionId: 'fv-ready' });
    });
  });

  describe('checkReadyToProduction', () => {
    const mockFindOneRead = (fv: ReturnType<typeof mkFvNode>) =>
      mkRecord({
        featureVersion: fv,
        services: [],
        componentVersions: [],
        componentCount: 0,
        teamCount: 0,
        inheritedFromId: null,
      });

    it('returns not ready with no_component_bindings when feature has no USES_COMPONENT_VERSION', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.readyToProduction).toBe(false);
      expect(result.reason).toBe(FeatureVersionReadinessReason.NoComponentBindings);
      expect(result.bindings).toEqual([]);
      expect(result.crossUnitBindings).toEqual([]);
      expect(result.featureVersion.status).toBe(VersionStatus.Draft);
    });

    it('returns application_has_no_current_release when application has no current release', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ hasCurrentRelease: false, statusInRelease: null })],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.readyToProduction).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.bindings).toHaveLength(1);
      expect(result.bindings[0]?.reason).toBe(
        FeatureBindingReadinessReason.ApplicationHasNoCurrentRelease,
      );
      expect(result.bindings[0]?.ready).toBe(false);
    });

    it('returns component_not_in_current_release when component is missing from current release', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: null })],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.readyToProduction).toBe(false);
      expect(result.bindings[0]?.reason).toBe(
        FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
      );
    });

    it('returns component_not_active_in_release when HAS_COMPONENT status is unactive', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: 'unactive' })],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.readyToProduction).toBe(false);
      expect(result.bindings[0]?.reason).toBe(
        FeatureBindingReadinessReason.ComponentNotActiveInRelease,
      );
    });

    it('treats deprecated in release as ready', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: 'deprecated' })],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.readyToProduction).toBe(true);
      expect(result.bindings[0]?.reason).toBe(FeatureBindingReadinessReason.Ready);
      expect(result.bindings[0]?.statusInRelease).toBe(VersionStatus.Deprecated);
      expect(result.bindings[0]?.componentName).toBe('Cmp One');
      expect(read).toHaveBeenCalledWith(
        expect.stringMatching(
          /OPTIONAL MATCH \(c:Component \{id: cv\.componentId\}\)[\s\S]*componentName: coalesce\(c\.name, cv\.name, ''\)/,
        ),
        expect.objectContaining({ ids: ['fv1'] }),
      );
    });

    it('evaluates the same component version in two applications as two bindings', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [
                  mkBindingRow({
                    applicationId: 'app-1',
                    applicationName: 'App One',
                    statusInRelease: 'active',
                  }),
                  mkBindingRow({
                    applicationId: 'app-2',
                    applicationName: 'App Two',
                    statusInRelease: null,
                    hasCurrentRelease: true,
                  }),
                ],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.bindings).toHaveLength(2);
      expect(result.readyToProduction).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.bindings.map((binding) => binding.applicationId)).toEqual(['app-1', 'app-2']);
      expect(result.bindings[1]?.reason).toBe(
        FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
      );
    });

    it('auto-publishes when canAutoActive and ready, returning active status', async () => {
      const draftFv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: true });
      const activeFv = mkFvNode({ id: 'fv1', status: 'active', canAutoActive: true });
      let published = false;
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: published ? 'active' : 'draft',
                canAutoActive: true,
                bindingRows: [mkBindingRow({ statusInRelease: 'active' })],
              }),
            ],
          };
        }
        if (query.includes('usesAppIds')) {
          return {
            records: [mkRecord({ usesAppIds: ['app-1'], providerAppIds: [] })],
          };
        }
        if (query.includes('PINNED') || query.includes('applicationVersionId')) {
          return {
            records: [
              mkRecord({ applicationId: 'app-1', applicationVersionId: 'av-1' }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(published ? activeFv : draftFv)] };
        }
        return { records: [] };
      });
      const write = jest.fn().mockImplementation(async () => {
        published = true;
        return { records: [{ get: () => activeFv }] };
      });

      const service = await createService(read, write);
      const result = await service.checkReadyToProduction('fv1');

      expect(write).toHaveBeenCalled();
      const writeQuery = String(write.mock.calls[0][0] ?? '');
      expect(writeQuery).toContain('PINNED_TO_APPLICATION_VERSION');
      expect(result.featureVersion.status).toBe(VersionStatus.Active);
      expect(result.readyToProduction).toBe(true);
      expect(result.reason).toBeNull();
      expect(result.bindings[0]?.ready).toBe(true);
    });

    it('is not ready when USES are ready but cross-unit DEPENDS_ON provider is missing from current', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: 'active' })],
              }),
            ],
          };
        }
        if (query.includes('AS crossUnitBindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                crossUnitBindingRows: [
                  mkBindingRow({
                    applicationId: 'app-remote',
                    applicationName: 'Remote App',
                    componentId: 'cmp-remote',
                    componentName: 'Remote Cmp',
                    componentVersionId: 'cv-remote',
                    unitId: 'unit-remote',
                    statusInRelease: null,
                    hasCurrentRelease: true,
                  }),
                ],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.readyToProduction).toBe(false);
      expect(result.bindings[0]?.ready).toBe(true);
      expect(result.crossUnitBindings).toHaveLength(1);
      expect(result.crossUnitBindings[0]?.reason).toBe(
        FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
      );
    });

    it('is ready when USES and cross-unit DEPENDS_ON providers are in current', async () => {
      const fv = mkFvNode({ id: 'fv1', status: 'draft', canAutoActive: false });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: 'active' })],
              }),
            ],
          };
        }
        if (query.includes('AS crossUnitBindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                crossUnitBindingRows: [
                  mkBindingRow({
                    applicationId: 'app-remote',
                    componentVersionId: 'cv-remote',
                    unitId: 'unit-remote',
                    statusInRelease: 'active',
                  }),
                ],
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion')) {
          return { records: [mockFindOneRead(fv)] };
        }
        return { records: [] };
      });

      const service = await createService(read);
      const result = await service.checkReadyToProduction('fv1');

      expect(result.readyToProduction).toBe(true);
      expect(result.crossUnitBindings[0]?.ready).toBe(true);
    });
  });

  describe('publish', () => {
    it('rejects publish when draft has no USES_COMPONENT_VERSION', async () => {
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [],
              }),
            ],
          };
        }
        return { records: [] };
      });
      const write = jest.fn();
      const service = await createService(read, write);

      await expect(service.publish({ featureVersionId: 'fv1' })).rejects.toThrow(
        /Нет связанных компонентов/,
      );
      expect(write).not.toHaveBeenCalled();
    });

    it('creates PINNED_TO_APPLICATION_VERSION for USES and provider apps', async () => {
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: 'active' })],
              }),
            ],
          };
        }
        if (query.includes('usesAppIds')) {
          return {
            records: [
              mkRecord({ usesAppIds: ['app-1'], providerAppIds: ['app-remote'] }),
            ],
          };
        }
        if (query.includes('applicationVersionId')) {
          return {
            records: [
              mkRecord({ applicationId: 'app-1', applicationVersionId: 'av-1' }),
              mkRecord({ applicationId: 'app-remote', applicationVersionId: 'av-remote' }),
            ],
          };
        }
        return { records: [] };
      });
      const write = jest.fn().mockResolvedValue({
        records: [{ get: () => mkFvNode({ id: 'fv1', status: 'active' }) }],
      });
      const service = await createService(read, write);

      await service.publish({ featureVersionId: 'fv1' });

      const writeQuery = String(write.mock.calls[0][0] ?? '');
      const writeParams = write.mock.calls[0][1] as Record<string, unknown>;
      expect(writeQuery).toContain('PINNED_TO_APPLICATION_VERSION');
      expect(writeParams.pins).toEqual([
        { applicationId: 'app-1', applicationVersionId: 'av-1' },
        { applicationId: 'app-remote', applicationVersionId: 'av-remote' },
      ]);
    });

    it('rejects publish with 400 when ApplicationVersion pin cannot be resolved', async () => {
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: 'active' })],
              }),
            ],
          };
        }
        if (query.includes('usesAppIds')) {
          return {
            records: [mkRecord({ usesAppIds: ['app-1', 'app-missing'], providerAppIds: [] })],
          };
        }
        if (query.includes('applicationVersionId')) {
          return {
            records: [mkRecord({ applicationId: 'app-1', applicationVersionId: 'av-1' })],
          };
        }
        return { records: [] };
      });
      const write = jest.fn();
      const service = await createService(read, write);

      await expect(service.publish({ featureVersionId: 'fv1' })).rejects.toThrow(
        /missing current release for applications: app-missing/,
      );
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe('transition', () => {
    it('rejects transition from active to deprecated', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [{ get: () => mkFvNode({ id: 'fv1', status: 'active' }) }],
      });
      const write = jest.fn();
      const service = await createService(read, write);
      await expect(
        service.transition({ featureVersionId: 'fv1', status: VersionStatus.Deprecated }),
      ).rejects.toThrow(BadRequestException);

      expect(write).not.toHaveBeenCalled();
    });

    it('rejects draft to active when there are no component bindings', async () => {
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [],
              }),
            ],
          };
        }
        if (query.includes('RETURN fv')) {
          return { records: [mkRecord({ fv: mkFvNode({ id: 'fv1', status: 'draft' }) })] };
        }
        return { records: [] };
      });
      const write = jest.fn();
      const service = await createService(read, write);

      await expect(
        service.transition({ featureVersionId: 'fv1', status: VersionStatus.Active }),
      ).rejects.toThrow(/Нет связанных компонентов/);
      expect(write).not.toHaveBeenCalled();
    });

    it('replaces HAS_DRAFT with HAS_VERSION for draft to active', async () => {
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('AS bindingRows')) {
          return {
            records: [
              mkRecord({
                id: 'fv1',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [mkBindingRow({ statusInRelease: 'active' })],
              }),
            ],
          };
        }
        if (query.includes('usesAppIds')) {
          return {
            records: [mkRecord({ usesAppIds: ['app-1'], providerAppIds: [] })],
          };
        }
        if (query.includes('applicationVersionId')) {
          return {
            records: [mkRecord({ applicationId: 'app-1', applicationVersionId: 'av-1' })],
          };
        }
        if (query.includes('RETURN fv')) {
          return { records: [mkRecord({ fv: mkFvNode({ id: 'fv1', status: 'draft' }) })] };
        }
        return { records: [] };
      });
      const write = jest.fn().mockResolvedValue({
        records: [{ get: () => mkFvNode({ id: 'fv1', status: 'active' }) }],
      });

      const service = await createService(read, write);
      await service.transition({ featureVersionId: 'fv1', status: VersionStatus.Active });

      expect(write).toHaveBeenCalledTimes(1);
      const writeQuery = String(write.mock.calls[0][0] ?? '');
      const writeParams = write.mock.calls[0][1] as Record<string, unknown>;
      expect(writeQuery).toContain('DELETE draftLink');
      expect(writeQuery).toContain('CREATE (feature)-[:HAS_VERSION]->(draft)');
      expect(writeQuery).toContain('PINNED_TO_APPLICATION_VERSION');
      expect(writeParams).toEqual(
        expect.objectContaining({
          featureVersionId: 'fv1',
          pins: [{ applicationId: 'app-1', applicationVersionId: 'av-1' }],
        }),
      );
    });

    it('does not create PINNED edges on unactive to active', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [mkRecord({ fv: mkFvNode({ id: 'fv1', status: 'unactive' }) })],
      });
      const write = jest.fn().mockResolvedValue({
        records: [{ get: () => mkFvNode({ id: 'fv1', status: 'active' }) }],
      });
      const service = await createService(read, write);

      await service.transition({ featureVersionId: 'fv1', status: VersionStatus.Active });

      const writeQuery = String(write.mock.calls[0][0] ?? '');
      expect(writeQuery).not.toContain('PINNED_TO_APPLICATION_VERSION');
    });
  });

  describe('raiseComponentVersion', () => {
    const draftStatusRead = () => mkRecord({ value: 'draft' });

    const raiseReads = (fromStatus: string, versionNumber = 1) =>
      jest.fn().mockImplementation(async (query: string, params?: Record<string, unknown>) => {
        if (query.includes('RETURN fv.status AS value')) {
          return { records: [draftStatusRead()] };
        }
        if (query.includes('USES_COMPONENT_VERSION {applicationId') && query.includes('count(*)')) {
          return { records: [mkRecord({ value: 1 })] };
        }
        if (query.includes('cv.componentId AS componentId')) {
          if (query.includes('$toComponentVersionId')) {
            return {
              records: [
                mkRecord({
                  componentId: 'cmp-1',
                  versionNumber: versionNumber + 1,
                  status: 'active',
                }),
              ],
            };
          }
          return {
            records: [
              mkRecord({
                componentId: 'cmp-1',
                versionNumber,
                status: fromStatus,
              }),
            ],
          };
        }
        if (query.includes('DEPENDS_ON') && query.includes('target.id AS targetId')) {
          if (params?.componentVersionId === 'cv-2') {
            return { records: [] };
          }
          return {
            records: [
              mkRecord({
                targetId: 'prov-1',
                context: {
                  consumerApplicationId: 'app-a',
                  consumerFeatureVersionId: 'fv-old',
                  providerFeatureVersionId: 'fv-old',
                  consumerServiceId: 'svc-1',
                  providerServiceId: 'svc-1',
                  consumerFeatureId: 'f-1',
                  providerFeatureId: 'f-1',
                  providerApplicationId: 'app-a',
                },
              }),
              mkRecord({
                targetId: 'prov-2',
                context: {
                  consumerApplicationId: 'app-b',
                  consumerFeatureVersionId: 'fv-old',
                  providerFeatureVersionId: 'fv-old',
                  consumerServiceId: 'svc-1',
                  providerServiceId: 'svc-1',
                  consumerFeatureId: 'f-1',
                  providerFeatureId: 'f-1',
                  providerApplicationId: 'app-b',
                },
              }),
            ],
          };
        }
        return { records: [] };
      });

    it('creates draft CV when toComponentVersionId is omitted and syncs DEPENDS_ON for one app', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'cv-2' });
      const read = raiseReads('active');
      const write = jest.fn().mockResolvedValue({ records: [] });
      const service = await createService(read, write, {
        componentVersionService: { create },
      });
      const patchSpy = jest
        .spyOn(service, 'patchUsesComponentVersions')
        .mockResolvedValue({ id: 'fv-draft' } as never);

      const result = await service.raiseComponentVersion({
        featureVersionId: 'fv-draft',
        fromComponentVersionId: 'cv-1',
        applicationId: 'app-a',
      });

      expect(create).toHaveBeenCalledWith(
        { componentElementId: 'cmp-1' },
        expect.any(Function),
      );
      expect(patchSpy).toHaveBeenCalledWith(
        'fv-draft',
        [{ componentVersionId: 'cv-2', applicationId: 'app-a' }],
        [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
        expect.any(Function),
      );
      expect(result).toEqual({
        fromComponentVersionId: 'cv-1',
        toComponentVersionId: 'cv-2',
        applicationId: 'app-a',
        createdComponentVersion: true,
      });
      const createDependsCalls = write.mock.calls.filter((call) =>
        String(call[0] ?? '').includes('CREATE (from)-[:DEPENDS_ON'),
      );
      expect(createDependsCalls).toHaveLength(1);
      expect(createDependsCalls[0][1]).toEqual(
        expect.objectContaining({
          source: 'cv-2',
          target: 'prov-1',
          props: expect.objectContaining({
            consumerFeatureVersionId: 'fv-draft',
          }),
        }),
      );
    });

    it('rewrites DEPENDS_ON on created CV when source has no matching edges', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'cv-2' });
      const read = jest.fn().mockImplementation(async (query: string, params?: Record<string, unknown>) => {
        if (query.includes('RETURN fv.status AS value')) {
          return { records: [draftStatusRead()] };
        }
        if (query.includes('USES_COMPONENT_VERSION {applicationId') && query.includes('count(*)')) {
          return { records: [mkRecord({ value: 1 })] };
        }
        if (query.includes('cv.componentId AS componentId')) {
          return {
            records: [
              mkRecord({ componentId: 'cmp-1', versionNumber: 1, status: 'active' }),
            ],
          };
        }
        if (query.includes('DEPENDS_ON') && query.includes('target.id AS targetId')) {
          if (params?.componentVersionId === 'cv-1') {
            return { records: [] };
          }
          return {
            records: [
              mkRecord({
                targetId: 'prov-1',
                context: {
                  consumerApplicationId: 'app-a',
                  consumerFeatureVersionId: 'fv-old',
                  providerFeatureVersionId: 'fv-old',
                  consumerServiceId: 'svc-1',
                  providerServiceId: 'svc-1',
                  consumerFeatureId: 'f-1',
                  providerFeatureId: 'f-1',
                  providerApplicationId: 'app-a',
                },
              }),
            ],
          };
        }
        return { records: [] };
      });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const service = await createService(read, write, {
        componentVersionService: { create },
      });
      jest.spyOn(service, 'patchUsesComponentVersions').mockResolvedValue({ id: 'fv-draft' } as never);

      await service.raiseComponentVersion({
        featureVersionId: 'fv-draft',
        fromComponentVersionId: 'cv-1',
        applicationId: 'app-a',
      });

      const rewriteCalls = write.mock.calls.filter((call) =>
        String(call[0] ?? '').includes('SET r += $props'),
      );
      expect(rewriteCalls).toHaveLength(1);
      expect(rewriteCalls[0][1]).toEqual(
        expect.objectContaining({
          props: expect.objectContaining({
            consumerFeatureVersionId: 'fv-draft',
          }),
        }),
      );
      expect(
        write.mock.calls.some((call) => String(call[0] ?? '').includes('DELETE r')),
      ).toBe(false);
    });

    it('uses existing toComponentVersionId without create', async () => {
      const create = jest.fn();
      const read = raiseReads('active');
      const service = await createService(read, jest.fn().mockResolvedValue({ records: [] }), {
        componentVersionService: { create },
      });
      jest.spyOn(service, 'patchUsesComponentVersions').mockResolvedValue({ id: 'fv-draft' } as never);

      const result = await service.raiseComponentVersion({
        featureVersionId: 'fv-draft',
        fromComponentVersionId: 'cv-1',
        applicationId: 'app-a',
        toComponentVersionId: 'cv-2',
      });

      expect(create).not.toHaveBeenCalled();
      expect(result.createdComponentVersion).toBe(false);
      expect(result.toComponentVersionId).toBe('cv-2');
    });

    it('retargets incoming DEPENDS_ON of this draft from old CV to new CV', async () => {
      const incomingContext = {
        consumerApplicationId: 'app-b',
        consumerFeatureVersionId: 'fv-draft',
        providerFeatureVersionId: 'fv-draft',
        consumerServiceId: 'svc-1',
        providerServiceId: 'svc-1',
        consumerFeatureId: 'f-1',
        providerFeatureId: 'f-1',
        providerApplicationId: 'app-a',
      };
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('RETURN fv.status AS value')) {
          return { records: [draftStatusRead()] };
        }
        if (query.includes('USES_COMPONENT_VERSION {applicationId') && query.includes('count(*)')) {
          return { records: [mkRecord({ value: 1 })] };
        }
        if (query.includes('cv.componentId AS componentId')) {
          if (query.includes('$toComponentVersionId')) {
            return {
              records: [
                mkRecord({ componentId: 'cmp-1', versionNumber: 2, status: 'draft' }),
              ],
            };
          }
          return {
            records: [mkRecord({ componentId: 'cmp-1', versionNumber: 1, status: 'active' })],
          };
        }
        if (query.includes('DEPENDS_ON') && query.includes('target.id AS targetId')) {
          return { records: [] };
        }
        if (query.includes('DEPENDS_ON') && query.includes('source.id AS sourceId')) {
          return {
            records: [mkRecord({ sourceId: 'consumer-cv', context: incomingContext })],
          };
        }
        if (query.includes('count(*) AS value') && query.includes('$toId')) {
          return { records: [mkRecord({ value: 0 })] };
        }
        return { records: [] };
      });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const service = await createService(read, write, {
        componentVersionService: { create: jest.fn() },
      });
      jest.spyOn(service, 'patchUsesComponentVersions').mockResolvedValue({ id: 'fv-draft' } as never);

      await service.raiseComponentVersion({
        featureVersionId: 'fv-draft',
        fromComponentVersionId: 'cv-1',
        applicationId: 'app-a',
        toComponentVersionId: 'cv-2',
      });

      const deleteIncoming = write.mock.calls.find(
        (call) =>
          String(call[0] ?? '').includes('DELETE r') &&
          String(call[0] ?? '').includes('$fromId'),
      );
      expect(deleteIncoming?.[1]).toEqual(
        expect.objectContaining({
          sourceId: 'consumer-cv',
          fromId: 'cv-1',
          consumerFeatureVersionId: 'fv-draft',
          consumerApplicationId: 'app-b',
          providerApplicationId: 'app-a',
        }),
      );
      const createRetarget = write.mock.calls.find(
        (call) =>
          String(call[0] ?? '').includes('CREATE (from)-[:DEPENDS_ON') &&
          (call[1] as { source?: string; target?: string } | undefined)?.source === 'consumer-cv',
      );
      expect(createRetarget?.[1]).toEqual(
        expect.objectContaining({
          source: 'consumer-cv',
          target: 'cv-2',
          props: expect.objectContaining(incomingContext),
        }),
      );
    });

    it('rejects when from CV is draft and to is omitted', async () => {
      const read = raiseReads('draft');
      const service = await createService(read, jest.fn());
      await expect(
        service.raiseComponentVersion({
          featureVersionId: 'fv-draft',
          fromComponentVersionId: 'cv-draft',
          applicationId: 'app-a',
        }),
      ).rejects.toThrow(/already draft/);
    });

    it('maps existing draft create conflict to ConflictException', async () => {
      const create = jest.fn().mockRejectedValue(
        new BadRequestException('Component already has a draft version'),
      );
      const read = raiseReads('active');
      const service = await createService(read, jest.fn(), {
        componentVersionService: { create },
      });
      await expect(
        service.raiseComponentVersion({
          featureVersionId: 'fv-draft',
          fromComponentVersionId: 'cv-1',
          applicationId: 'app-a',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects non-draft feature version', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [mkRecord({ value: 'active' })],
      });
      const service = await createService(read, jest.fn());
      await expect(
        service.raiseComponentVersion({
          featureVersionId: 'fv-active',
          fromComponentVersionId: 'cv-1',
          applicationId: 'app-a',
        }),
      ).rejects.toThrow(/только в статусе draft/);
    });
  });

  describe('create', () => {
    it('inherits USES and copies DEPENDS_ON with new consumerFeatureVersionId', async () => {
      const draftNode = mkFvNode({ id: 'fv-new', status: 'draft', versionNumber: 2, version: '2' });
      const read = jest.fn().mockImplementation(async (query: string) => {
        if (query.includes('count(draft) AS draftCount')) {
          return { records: [mkRecord({ featureId: 'feat-1', draftCount: 0 })] };
        }
        if (query.includes('max(v.versionNumber)')) {
          return { records: [mkRecord({ value: 1 })] };
        }
        if (query.includes('count(v) AS value') && query.includes('v.version = $version')) {
          return { records: [mkRecord({ value: 0 })] };
        }
        if (query.includes('RETURN DISTINCT cv.id AS componentVersionId')) {
          return {
            records: [mkRecord({ componentVersionId: 'cv-1', applicationId: 'app-a' })],
          };
        }
        if (query.includes('properties(dep) AS context') && query.includes('INHERITED')) {
          return {
            records: [
              mkRecord({
                sourceId: 'cv-1',
                targetId: 'cv-2',
                context: {
                  consumerApplicationId: 'app-a',
                  providerApplicationId: 'app-b',
                  consumerFeatureVersionId: 'fv-old',
                  providerFeatureVersionId: 'fv-other',
                },
              }),
            ],
          };
        }
        if (query.includes('AS featureVersion') || query.includes('featureVersionWithRelations')) {
          return {
            records: [
              mkRecord({
                featureVersion: draftNode,
                services: [],
                componentVersions: [],
                componentCount: 0,
                teamCount: 0,
                inheritedFromId: 'fv-old',
              }),
            ],
          };
        }
        if (query.includes('AS bindingRows') || query.includes('readyToProduction')) {
          return {
            records: [
              mkRecord({
                id: 'fv-new',
                status: 'draft',
                canAutoActive: false,
                bindingRows: [],
              }),
            ],
          };
        }
        return { records: [] };
      });
      const write = jest.fn().mockResolvedValue({
        records: [mkRecord({ newDraft: draftNode })],
      });
      const service = await createService(read, write);
      jest
        .spyOn(
          service as unknown as {
            appendUsesComponentVersionsNoResolve: (...args: unknown[]) => Promise<void>;
          },
          'appendUsesComponentVersionsNoResolve',
        )
        .mockResolvedValue(undefined);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'fv-new',
        status: VersionStatus.Draft,
      } as never);

      await service.create({ featureElementId: 'feat-1', version: '2' });

      const createDraftCall = write.mock.calls.find((call) =>
        String(call[0] ?? '').includes('CREATE (newDraft:FeatureVersion'),
      );
      const createdId = String(
        (createDraftCall?.[1] as { id?: string } | undefined)?.id ?? '',
      );
      expect(createdId.length).toBeGreaterThan(0);

      const createDependsCalls = write.mock.calls.filter((call) =>
        String(call[0] ?? '').includes('CREATE (from)-[:DEPENDS_ON'),
      );
      expect(createDependsCalls).toHaveLength(1);
      expect(createDependsCalls[0][1]).toEqual(
        expect.objectContaining({
          source: 'cv-1',
          target: 'cv-2',
          props: expect.objectContaining({
            consumerFeatureVersionId: createdId,
            providerFeatureVersionId: 'fv-other',
            consumerApplicationId: 'app-a',
            providerApplicationId: 'app-b',
          }),
        }),
      );
    });
  });

  describe('patchUsesComponentVersions', () => {
    const duplicateMessage = 'Такая версия компонента уже добавлена в это приложение';

    const patchRead = (options: {
      linked?: ReadonlyArray<{ componentVersionId: string; applicationId: string }>;
      resolveIds?: ReadonlyArray<string>;
    }) => {
      const linked = options.linked ?? [];
      const resolveIds = new Set(options.resolveIds ?? ['cv-1', 'cv-2']);
      return jest.fn().mockImplementation(async (query: string, params?: Record<string, unknown>) => {
        if (query.includes('RETURN fv.status AS value')) {
          return { records: [mkRecord({ value: 'draft' })] };
        }
        if (query.includes('MATCH (cv:ComponentVersion {id: $id})')) {
          const id = String(params?.id ?? '');
          if (resolveIds.has(id)) {
            return { records: [mkRecord({ value: id })] };
          }
          return { records: [] };
        }
        if (
          query.includes('HAS_DRAFT]->(cv:ComponentVersion)') ||
          query.includes('HAS_VERSION]->(cv:ComponentVersion)')
        ) {
          return { records: [] };
        }
        if (
          query.includes('RETURN cv.id AS componentVersionId, uses.applicationId AS applicationId')
        ) {
          return {
            records: linked.map((binding) =>
              mkRecord({
                componentVersionId: binding.componentVersionId,
                applicationId: binding.applicationId,
              }),
            ),
          };
        }
        if (query.includes('feature.unitId AS value')) {
          return { records: [mkRecord({ value: 'unit-1' })] };
        }
        if (query.includes('RETURN DISTINCT cv.componentId AS value')) {
          return { records: [] };
        }
        if (query.includes('collect(DISTINCT {applicationId')) {
          const ids = (params?.componentVersionIds as string[]) ?? [];
          return {
            records: ids.map((id) =>
              mkRecord({
                id,
                componentId: 'cmp-1',
                status: 'active',
                appEdges: [],
              }),
            ),
          };
        }
        if (query.includes('UNWIND $applicationIds') && query.includes('Application')) {
          const applicationIds = (params?.applicationIds as string[]) ?? [];
          return {
            records: applicationIds.map((applicationId) => mkRecord({ value: applicationId })),
          };
        }
        return { records: [] };
      });
    };

    const createWrites = (write: jest.Mock) =>
      write.mock.calls.filter((call) =>
        String(call[0] ?? '').includes('CREATE (fv)-[:USES_COMPONENT_VERSION'),
      );

    it('rejects duplicate CV+application without CREATE', async () => {
      const read = patchRead({
        linked: [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
        resolveIds: ['cv-1'],
      });
      const write = jest.fn();
      const service = await createService(read, write);
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'fv-draft' } as never);

      await expect(
        service.patchUsesComponentVersions(
          'fv-draft',
          [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
          [],
        ),
      ).rejects.toThrow(duplicateMessage);
      expect(createWrites(write)).toHaveLength(0);
    });

    it('allows a different ComponentVersion for the same application', async () => {
      const read = patchRead({
        linked: [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
        resolveIds: ['cv-2'],
      });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const service = await createService(read, write);
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'fv-draft' } as never);

      await expect(
        service.patchUsesComponentVersions(
          'fv-draft',
          [{ componentVersionId: 'cv-2', applicationId: 'app-a' }],
          [],
        ),
      ).resolves.toEqual({ id: 'fv-draft' });
      expect(createWrites(write)).toHaveLength(1);
      expect(createWrites(write)[0][1]).toEqual(
        expect.objectContaining({
          componentVersionId: 'cv-2',
          applicationId: 'app-a',
        }),
      );
    });

    it('allows the same ComponentVersion for another application', async () => {
      const read = patchRead({
        linked: [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
        resolveIds: ['cv-1'],
      });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const service = await createService(read, write);
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'fv-draft' } as never);

      await expect(
        service.patchUsesComponentVersions(
          'fv-draft',
          [{ componentVersionId: 'cv-1', applicationId: 'app-b' }],
          [],
        ),
      ).resolves.toEqual({ id: 'fv-draft' });
      expect(createWrites(write)).toHaveLength(1);
      expect(createWrites(write)[0][1]).toEqual(
        expect.objectContaining({
          componentVersionId: 'cv-1',
          applicationId: 'app-b',
        }),
      );
    });

    it('rejects entire add batch when any binding is a duplicate', async () => {
      const read = patchRead({
        linked: [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
        resolveIds: ['cv-1', 'cv-2'],
      });
      const write = jest.fn();
      const service = await createService(read, write);
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'fv-draft' } as never);

      await expect(
        service.patchUsesComponentVersions(
          'fv-draft',
          [
            { componentVersionId: 'cv-2', applicationId: 'app-a' },
            { componentVersionId: 'cv-1', applicationId: 'app-a' },
          ],
          [],
        ),
      ).rejects.toThrow(duplicateMessage);
      expect(createWrites(write)).toHaveLength(0);
    });

    it('allows remove and re-add of the same binding in one request', async () => {
      const read = patchRead({
        linked: [],
        resolveIds: ['cv-1'],
      });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const service = await createService(read, write);
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'fv-draft' } as never);

      await expect(
        service.patchUsesComponentVersions(
          'fv-draft',
          [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
          [{ componentVersionId: 'cv-1', applicationId: 'app-a' }],
        ),
      ).resolves.toEqual({ id: 'fv-draft' });

      expect(
        write.mock.calls.some((call) => String(call[0] ?? '').includes('DELETE usesLink')),
      ).toBe(true);
      expect(createWrites(write)).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('deletes draft when only USES (and parent/INHERITED) exist', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [mkRecord({ id: 'fv-draft', incoming: [null], outgoing: [null] })],
      });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const service = await createService(read, write);

      await expect(service.remove('fv-draft')).resolves.toEqual({ id: 'fv-draft' });

      expect(String(read.mock.calls[0][0])).toContain('USES_COMPONENT_VERSION');
      expect(write).toHaveBeenCalledTimes(2);
      expect(String(write.mock.calls[0][0])).toContain('DEPENDS_ON');
      expect(String(write.mock.calls[0][0])).toContain('consumerFeatureVersionId');
      expect(write.mock.calls[0][1]).toEqual({ featureVersionId: 'fv-draft' });
      expect(String(write.mock.calls[1][0])).toContain('DETACH DELETE');
      expect(write.mock.calls[1][1]).toEqual({ featureVersionId: 'fv-draft' });
    });

    it('blocks delete when non-USES blocking relation exists', async () => {
      const blocking = {
        relationType: 'PINNED_TO_APPLICATION_VERSION',
        direction: 'outgoing',
        targetId: 'av-1',
        targetKind: 'ApplicationVersion',
        targetName: '1.0',
      };
      const read = jest.fn().mockResolvedValue({
        records: [mkRecord({ id: 'fv-draft', incoming: [null], outgoing: [blocking] })],
      });
      const write = jest.fn();
      const service = await createService(read, write);

      await expect(service.remove('fv-draft')).rejects.toBeInstanceOf(BadRequestException);
      expect(write).not.toHaveBeenCalled();
    });

    it('rejects when feature version is not a draft', async () => {
      const read = jest.fn().mockResolvedValue({ records: [] });
      const write = jest.fn();
      const service = await createService(read, write);

      await expect(service.remove('fv-active')).rejects.toThrow(
        /Cannot delete featureVersion: must be latest draft/,
      );
      expect(write).not.toHaveBeenCalled();
    });
  });
});

