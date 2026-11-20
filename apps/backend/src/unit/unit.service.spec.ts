import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { UnitService } from './unit.service';

const unitProps = (overrides: Record<string, unknown> = {}) => ({
  id: 't1',
  name: 'Acme',
  description: null as string | null,
  type: 'unit',
  ...overrides,
});

const mkNode = (props: Record<string, unknown>) => ({
  properties: props,
  id: props.id as string,
  label: 'Unit' as const,
});

const mkValueRecord = (props: Record<string, unknown>) => ({
  get: (key: string) => (key === 'value' ? mkNode(props) : undefined),
});

const uniquenessNoDuplicate = () => ({
  records: [{ get: (key: string) => (key === 'exists' ? false : undefined) }],
});

const uniquenessDuplicate = () => ({
  records: [{ get: (key: string) => (key === 'exists' ? true : undefined) }],
});

describe('UnitService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl?: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: writeImpl ?? jest.fn().mockResolvedValue({ records: [] }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [UnitService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(UnitService), neo4j };
  };

  describe('update', () => {
    it('returns null when unit missing', async () => {
      const read = jest.fn().mockResolvedValue({ records: [] });
      const { service } = await setup(read);
      const res = await service.update('missing', {});
      expect(res).toBeNull();
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws when name is empty after trim', async () => {
      const props = unitProps();
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(props)] });
      const { service } = await setup(read);
      await expect(service.update('t1', { name: '   ' })).rejects.toThrow(BadRequestException);
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws when name differs from stored', async () => {
      const props = unitProps({ name: 'Acme' });
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(props)] });
      const { service } = await setup(read);
      await expect(service.update('t1', { name: 'Other' })).rejects.toThrow('Unit name is immutable');
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws Conflict when uniqueness check finds duplicate', async () => {
      const props = unitProps({ name: 'Acme' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(props)] })
        .mockResolvedValueOnce(uniquenessDuplicate());
      const { service } = await setup(read);
      await expect(service.update('t1', { name: 'Acme' })).rejects.toThrow(ConflictException);
      expect(read).toHaveBeenCalledTimes(2);
    });

    it('updates description when name unchanged', async () => {
      const before = unitProps({ description: 'old' });
      const after = unitProps({ description: 'new' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn().mockResolvedValue({ records: [mkValueRecord(after)] });
      const { service } = await setup(read, write);
      const res = await service.update('t1', { name: 'Acme', description: 'new' });
      expect(res?.description).toBe('new');
      expect(write).toHaveBeenCalled();
    });

    it('returns dto without write when only matching name and no description change', async () => {
      const before = unitProps();
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.update('t1', { name: 'Acme' });
      expect(res).toMatchObject({ name: 'Acme', id: 't1' });
      expect(write).not.toHaveBeenCalled();
    });

    it('does not call uniqueness read when name omitted', async () => {
      const before = unitProps({ description: 'old' });
      const after = unitProps({ description: 'new' });
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(before)] });
      const write = jest.fn().mockResolvedValue({ records: [mkValueRecord(after)] });
      const { service } = await setup(read, write);
      const res = await service.update('t1', { description: 'new' });
      expect(res?.description).toBe('new');
      expect(read).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalled();
    });

    it('accepts name with surrounding spaces equal to stored after normalization', async () => {
      const before = unitProps({ name: 'Acme' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.update('t1', { name: '  Acme  ' });
      expect(res?.name).toBe('Acme');
      expect(write).not.toHaveBeenCalled();
    });
  });
});
