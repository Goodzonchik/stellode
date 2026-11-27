import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { TeamService } from './team.service';

const teamProps = (overrides: Record<string, unknown> = {}) => ({
  id: 'tm1',
  unitId: 't10',
  name: 'Alpha',
  description: null as string | null,
  type: 'team',
  ...overrides,
});

const mkNode = (props: Record<string, unknown>) => ({
  properties: props,
  id: props.id as string,
  label: 'Team' as const,
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

describe('TeamService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl?: jest.Mock) => {
    const neo4j = {
      read: readImpl,
      write: writeImpl ?? jest.fn().mockResolvedValue({ records: [] }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [TeamService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(TeamService), neo4j };
  };

  describe('update', () => {
    it('returns null when team missing', async () => {
      const read = jest.fn().mockResolvedValue({ records: [] });
      const { service } = await setup(read);
      const res = await service.update('missing', {});
      expect(res).toBeNull();
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws when name is empty after trim', async () => {
      const props = teamProps();
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(props)] });
      const { service } = await setup(read);
      await expect(service.update('tm1', { name: '   ' })).rejects.toThrow(BadRequestException);
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws when name differs from stored', async () => {
      const props = teamProps({ name: 'Alpha' });
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(props)] });
      const { service } = await setup(read);
      await expect(service.update('tm1', { name: 'Other' })).rejects.toThrow(
        'Team name is immutable',
      );
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('throws Conflict when uniqueness check finds duplicate in unit', async () => {
      const props = teamProps({ name: 'Alpha' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(props)] })
        .mockResolvedValueOnce(uniquenessDuplicate());
      const { service } = await setup(read);
      await expect(service.update('tm1', { name: 'Alpha' })).rejects.toThrow(ConflictException);
      expect(read).toHaveBeenCalledTimes(2);
    });

    it('updates description when name unchanged', async () => {
      const before = teamProps({ description: 'old' });
      const after = teamProps({ description: 'new' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn().mockResolvedValue({ records: [mkValueRecord(after)] });
      const { service } = await setup(read, write);
      const res = await service.update('tm1', { name: 'Alpha', description: 'new' });
      expect(res?.description).toBe('new');
      expect(write).toHaveBeenCalled();
    });

    it('clears description when empty string is sent', async () => {
      const before = teamProps({ description: 'old' });
      const after = teamProps({ description: null });
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(before)] });
      const write = jest.fn().mockResolvedValue({ records: [mkValueRecord(after)] });
      const { service, neo4j } = await setup(read, write);
      const res = await service.update('tm1', { description: '' });
      expect(res?.description).toBeNull();
      expect(neo4j.write).toHaveBeenCalledWith(
        expect.stringContaining('SET'),
        expect.objectContaining({ id: 'tm1', p0_description: null }),
      );
    });

    it('returns dto without write when only matching name and no description change', async () => {
      const before = teamProps();
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.update('tm1', { name: 'Alpha' });
      expect(res).toMatchObject({ name: 'Alpha', id: 'tm1', unitId: 't10' });
      expect(write).not.toHaveBeenCalled();
    });

    it('does not call uniqueness read when name omitted', async () => {
      const before = teamProps({ description: 'old' });
      const after = teamProps({ description: 'new' });
      const read = jest.fn().mockResolvedValueOnce({ records: [mkValueRecord(before)] });
      const write = jest.fn().mockResolvedValue({ records: [mkValueRecord(after)] });
      const { service } = await setup(read, write);
      const res = await service.update('tm1', { description: 'new' });
      expect(res?.description).toBe('new');
      expect(read).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalled();
    });

    it('accepts name with surrounding spaces equal to stored after normalization', async () => {
      const before = teamProps({ name: 'Alpha' });
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkValueRecord(before)] })
        .mockResolvedValueOnce(uniquenessNoDuplicate());
      const write = jest.fn();
      const { service } = await setup(read, write);
      const res = await service.update('tm1', { name: '  Alpha  ' });
      expect(res?.name).toBe('Alpha');
      expect(write).not.toHaveBeenCalled();
    });
  });
});
