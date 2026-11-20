import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ApplicationService } from './application.service';

const appProps = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  unitId: 't10',
  name: 'Portal',
  description: null as string | null,
  type: 'app',
  ...overrides,
});

const mkNode = (props: Record<string, unknown>) => ({
  properties: props,
  id: props.id as string,
  label: 'Application' as const,
});

const mkValueRecord = (props: Record<string, unknown>) => ({
  get: (key: string) => (key === 'value' ? mkNode(props) : undefined),
});

const uniquenessNoDuplicate = () => ({
  records: [{ get: (key: string) => (key === 'exists' ? false : undefined) }],
});

const mkAppCreateRecord = (props: Record<string, unknown>) => ({
  records: [{ get: (key: string) => (key === 'app' ? mkNode(props) : undefined) }],
});

const uniquenessDuplicate = () => ({
  records: [{ get: (key: string) => (key === 'exists' ? true : undefined) }],
});

describe('ApplicationService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl?: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: writeImpl ?? jest.fn().mockResolvedValue({ records: [] }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [ApplicationService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(ApplicationService), neo4j };
  };

  describe('create', () => {
    it('persists Application only (no ApplicationVersion until release)', async () => {
      const read = jest.fn().mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn().mockResolvedValue(mkAppCreateRecord(appProps()));
      const { service, neo4j } = await setup(read, write);
      const created = await service.create({ unitId: 't10', name: 'Portal' });
      expect(created).toMatchObject({ id: 'a1', unitId: 't10', name: 'Portal' });
      expect(read).toHaveBeenCalledTimes(1);
      expect(neo4j.write).toHaveBeenCalledTimes(1);
      const query = neo4j.write.mock.calls[0][0] as string;
      const params = neo4j.write.mock.calls[0][1] as Record<string, unknown>;
      expect(query).toContain('CREATE (app:Application');
      expect(query).not.toContain('ApplicationVersion');
      expect(params).toMatchObject({ unitId: 't10', name: 'Portal' });
    });
  });

  describe('findAll', () => {
    const mkListRecord = (args: {
      readonly app: Record<string, unknown>;
      readonly currentVersion: string | null;
      readonly currentVersionStatus: string | null;
      readonly hasStatusWarning?: boolean;
    }) => ({
      get: (key: string) => {
        if (key === 'app') return mkNode(args.app);
        if (key === 'currentVersion') return args.currentVersion;
        if (key === 'currentVersionStatus') return args.currentVersionStatus;
        if (key === 'hasStatusWarning') return args.hasStatusWarning ?? false;
        return undefined;
      },
    });

    it('returns current version when ApplicationVersion current exists', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [
          mkListRecord({
            app: appProps(),
            currentVersion: '2',
            currentVersionStatus: 'current',
            hasStatusWarning: true,
          }),
        ],
      });
      const { service, neo4j } = await setup(read);
      const rows = await service.findAll({ unitId: 't10' });
      expect(rows).toEqual([
        {
          id: 'a1',
          unitId: 't10',
          name: 'Portal',
          description: null,
          type: 'app',
          currentVersion: '2',
          currentVersionStatus: 'current',
          hasStatusWarning: true,
        },
      ]);
      const query = neo4j.read.mock.calls[0][0] as string;
      expect(query).toContain("status: 'current'");
      expect(query).toContain('currentVersion');
      expect(query).toContain('hasStatusWarning');
      expect(query).toContain("HAS_COMPONENT {status: 'deprecated'}");
      expect(query).toContain('USES_COMPONENT_VERSION');
    });

    it('returns previous status when only previous versions exist', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [
          mkListRecord({
            app: appProps(),
            currentVersion: '3',
            currentVersionStatus: 'previous',
            hasStatusWarning: false,
          }),
        ],
      });
      const { service } = await setup(read);
      const rows = await service.findAll({ unitId: 't10' });
      expect(rows[0]).toMatchObject({
        currentVersion: '3',
        currentVersionStatus: 'previous',
        hasStatusWarning: false,
      });
    });

    it('returns null version fields when application has no versions', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [
          mkListRecord({
            app: appProps(),
            currentVersion: null,
            currentVersionStatus: null,
            hasStatusWarning: false,
          }),
        ],
      });
      const { service } = await setup(read);
      const rows = await service.findAll({ unitId: 't10' });
      expect(rows[0]).toMatchObject({
        currentVersion: null,
        currentVersionStatus: null,
        hasStatusWarning: false,
      });
    });
  });

  describe('update', () => {
    it('returns null when application missing', async () => {
      const read = jest.fn().mockResolvedValue({ records: [] });
      const { service } = await setup(read);
      const res = await service.update('missing', {});
      expect(res).toBeNull();
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws when name is empty after trim', async () => {
      const props = appProps();
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(props)] });
      const { service } = await setup(read);
      await expect(service.update('a1', { name: '   ' })).rejects.toThrow(BadRequestException);
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws when name differs from stored', async () => {
      const props = appProps({ name: 'Portal' });
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(props)] });
      const { service } = await setup(read);
      await expect(service.update('a1', { name: 'Other' })).rejects.toThrow(
        'Application name is immutable',
      );
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws Conflict when uniqueness check finds duplicate in unit', async () => {
      const props = appProps({ name: 'Portal' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(props)] })
        .mockResolvedValueOnce(uniquenessDuplicate());
      const { service } = await setup(read);
      await expect(service.update('a1', { name: 'Portal' })).rejects.toThrow(ConflictException);
      expect(read).toHaveBeenCalledTimes(2);
    });

    it('updates description when name unchanged', async () => {
      const before = appProps({ description: 'old' });
      const after = appProps({ description: 'new' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn().mockResolvedValue({ records: [mkValueRecord(after)] });
      const { service } = await setup(read, write);
      const res = await service.update('a1', { name: 'Portal', description: 'new' });
      expect(res?.description).toBe('new');
      expect(write).toHaveBeenCalled();
    });

    it('returns dto without write when only matching name and no description change', async () => {
      const before = appProps();
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.update('a1', { name: 'Portal' });
      expect(res).toMatchObject({ name: 'Portal', id: 'a1', unitId: 't10' });
      expect(write).not.toHaveBeenCalled();
    });

    it('does not call uniqueness read when name omitted', async () => {
      const before = appProps({ description: 'old' });
      const after = appProps({ description: 'new' });
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(before)] });
      const write = jest.fn().mockResolvedValue({ records: [mkValueRecord(after)] });
      const { service } = await setup(read, write);
      const res = await service.update('a1', { description: 'new' });
      expect(res?.description).toBe('new');
      expect(read).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalled();
    });

    it('accepts name with surrounding spaces equal to stored after normalization', async () => {
      const before = appProps({ name: 'Portal' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.update('a1', { name: '  Portal  ' });
      expect(res?.name).toBe('Portal');
      expect(write).not.toHaveBeenCalled();
    });
  });
});
