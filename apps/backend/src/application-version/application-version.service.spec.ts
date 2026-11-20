import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { ApplicationVersionStatus, VersionStatus } from '@stellode/models';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ApplicationVersionService } from './application-version.service';

describe('ApplicationVersionService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl?: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: writeImpl ?? jest.fn().mockResolvedValue({ records: [] }),
    };
    const eventEmitter = { emit: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationVersionService,
        { provide: Neo4jService, useValue: neo4j },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();
    return {
      service: moduleRef.get(ApplicationVersionService),
      neo4j,
      eventEmitter,
    };
  };

  const avNode = (overrides: Record<string, unknown> = {}) => ({
    id: 'n-av1',
    properties: {
      id: 'av1',
      name: 'App',
      version: '1.0',
      versionNumber: 1,
      status: ApplicationVersionStatus.Current,
      type: 'applicationVersion',
      ...overrides,
    },
  });

  const findAvRecord = (node: ReturnType<typeof avNode>, applicationId = 'app1') => ({
    get: (key: string) => {
      if (key === 'applicationId') return applicationId;
      if (key === 'av') return node;
      return undefined;
    },
  });

  describe('renameVersion', () => {
    it('rejects empty version after trim', async () => {
      const read = jest.fn();
      const { service, neo4j } = await setup(read);
      await expect(service.renameVersion('av1', { version: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      expect(neo4j.read).not.toHaveBeenCalled();
    });

    it('rejects when ApplicationVersion is not found', async () => {
      const read = jest.fn().mockResolvedValueOnce({ records: [] });
      const { service } = await setup(read);
      await expect(service.renameVersion('missing', { version: '2.0' })).rejects.toThrow(
        /ApplicationVersion not found/,
      );
    });

    it('rejects rename for previous status', async () => {
      const node = avNode({ status: ApplicationVersionStatus.Previous });
      const read = jest.fn().mockResolvedValueOnce({ records: [findAvRecord(node)] });
      const { service, neo4j } = await setup(read);
      await expect(service.renameVersion('av1', { version: '2.0' })).rejects.toThrow(
        /Only current ApplicationVersion can be renamed/,
      );
      expect(neo4j.write).not.toHaveBeenCalled();
    });

    it('rejects when version conflicts within application', async () => {
      const node = avNode();
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [findAvRecord(node)] })
        .mockResolvedValueOnce({ records: [{ get: () => 1 }] });
      const { service } = await setup(read);
      await expect(service.renameVersion('av1', { version: '2.0' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('returns current row without write when version unchanged after trim', async () => {
      const node = avNode({ version: '1.0' });
      const read = jest.fn().mockResolvedValueOnce({ records: [findAvRecord(node)] });
      const write = jest.fn();
      const { service, neo4j } = await setup(read, write);
      const result = await service.renameVersion('av1', { version: '  1.0  ' });
      expect(result).toMatchObject({ id: 'av1', version: '1.0' });
      expect(neo4j.write).not.toHaveBeenCalled();
      expect(neo4j.read).toHaveBeenCalledTimes(1);
    });

    it('updates version for current ApplicationVersion', async () => {
      const before = avNode({ version: '1.0' });
      const after = avNode({ version: '1.1' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [findAvRecord(before)] })
        .mockResolvedValueOnce({ records: [{ get: () => 0 }] });
      const write = jest.fn().mockResolvedValueOnce({
        records: [{ get: () => after }],
      });
      const { service, neo4j } = await setup(read, write);
      const result = await service.renameVersion('av1', { version: ' 1.1 ' });
      expect(result).toMatchObject({ id: 'av1', version: '1.1', versionNumber: 1 });
      expect(neo4j.write).toHaveBeenCalledWith(
        expect.stringContaining('SET av.version'),
        expect.objectContaining({ id: 'av1', version: '1.1' }),
      );
    });

    it('allows case-only change of version string', async () => {
      const before = avNode({ version: '1.0-rc' });
      const after = avNode({ version: '1.0-RC' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [findAvRecord(before)] })
        .mockResolvedValueOnce({ records: [{ get: () => 0 }] });
      const write = jest.fn().mockResolvedValueOnce({
        records: [{ get: () => after }],
      });
      const { service } = await setup(read, write);
      const result = await service.renameVersion('av1', { version: '1.0-RC' });
      expect(result).toMatchObject({ version: '1.0-RC' });
    });
  });

  describe('release', () => {
    it('rejects sourceApplicationVersionId when application has no versions yet', async () => {
      const read = jest.fn().mockResolvedValueOnce({ records: [{ get: () => 0 }] });
      const { service, neo4j } = await setup(read);
      await expect(
        service.release({
          applicationId: 'app1',
          sourceApplicationVersionId: 'av-old',
          components: [{ componentVersionId: 'cv1', status: 'active' }],
        }),
      ).rejects.toThrow(/omit sourceApplicationVersionId/);
      expect(neo4j.read).toHaveBeenCalledTimes(1);
    });

    it('requires sourceApplicationVersionId when application already has versions', async () => {
      const read = jest.fn().mockResolvedValueOnce({ records: [{ get: () => 1 }] });
      const { service, neo4j } = await setup(read);
      await expect(
        service.release({
          applicationId: 'app1',
          components: [{ componentVersionId: 'cv1', status: 'active' }],
        }),
      ).rejects.toThrow(/sourceApplicationVersionId is required/);
      expect(neo4j.read).toHaveBeenCalledTimes(1);
    });

    it('rejects empty components', async () => {
      const read = jest.fn();
      const { service } = await setup(read);
      await expect(
        service.release({
          applicationId: 'app1',
          components: [],
        }),
      ).rejects.toThrow(/components must not be empty/);
    });

    it('rejects two active rows for the same component on first release', async () => {
      const cvNode = (id: string, componentId: string, status: string) => ({
        id: `n-${id}`,
        properties: { id, componentId, status },
      });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [{ get: () => 0 }] })
        .mockResolvedValueOnce({ records: [{ get: () => 'unit-1' }] })
        .mockResolvedValueOnce({
          records: [{ get: () => cvNode('cv1', 'c1', 'active') }],
        })
        .mockResolvedValueOnce({
          records: [{ get: () => cvNode('cv2', 'c1', 'deprecated') }],
        });
      const { service } = await setup(read);
      await expect(
        service.release({
          applicationId: 'app1',
          components: [
            { componentVersionId: 'cv1', status: 'active' },
            { componentVersionId: 'cv2', status: 'active' },
          ],
        }),
      ).rejects.toThrow(/at most one active/);
    });
  });

  describe('releasePreview', () => {
    it('rejects empty components for release mode', async () => {
      const read = jest.fn();
      const { service } = await setup(read);
      await expect(
        service.releasePreview({
          applicationId: 'app1',
          mode: 'release',
          components: [],
        }),
      ).rejects.toThrow(/components must not be empty/);
    });
  });

  describe('getComposition', () => {
    const compositionRow = (fields: Record<string, unknown>) => ({
      get: (key: string) => fields[key],
    });

    it('throws NotFoundException when ApplicationVersion is missing', async () => {
      const read = jest.fn().mockResolvedValueOnce({ records: [] });
      const { service } = await setup(read);
      await expect(service.getComposition('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns items with team and HAS_COMPONENT status', async () => {
      const node = avNode();
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [findAvRecord(node)] })
        .mockResolvedValueOnce({
          records: [
            compositionRow({
              componentVersionId: 'cv1',
              componentId: 'c1',
              componentName: 'Billing',
              teamId: 't1',
              teamName: 'Payments',
              componentVersion: '2.1',
              status: VersionStatus.Active,
              componentVersionStatus: VersionStatus.Active,
            }),
            compositionRow({
              componentVersionId: 'cv2',
              componentId: 'c2',
              componentName: 'Legacy',
              teamId: null,
              teamName: null,
              componentVersion: '1.0',
              status: VersionStatus.Deprecated,
              componentVersionStatus: VersionStatus.Unactive,
            }),
          ],
        });
      const { service } = await setup(read);
      const result = await service.getComposition('av1');
      expect(result).toEqual({
        applicationVersionId: 'av1',
        applicationId: 'app1',
        version: '1.0',
        status: ApplicationVersionStatus.Current,
        items: [
          {
            componentVersionId: 'cv1',
            componentId: 'c1',
            componentName: 'Billing',
            teamId: 't1',
            teamName: 'Payments',
            componentVersion: '2.1',
            status: VersionStatus.Active,
            componentVersionStatus: VersionStatus.Active,
          },
          {
            componentVersionId: 'cv2',
            componentId: 'c2',
            componentName: 'Legacy',
            teamId: null,
            teamName: null,
            componentVersion: '1.0',
            status: VersionStatus.Deprecated,
            componentVersionStatus: VersionStatus.Unactive,
          },
        ],
      });
    });
  });
});
