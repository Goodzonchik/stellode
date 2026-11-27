import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ComponentService } from './component.service';

const mkComponentNode = (props: Record<string, unknown>) => ({
  id: String(props.id),
  label: 'Component' as const,
  properties: props,
});

const mkComponentRecord = (
  props: Record<string, unknown>,
  team: { id: string; name: string } | null = { id: 'tm1', name: 'Team' },
) => ({
  get: (key: string) =>
    key === 'component'
      ? mkComponentNode(props)
      : key === 'teamId'
        ? (team?.id ?? null)
        : key === 'teamName'
          ? (team?.name ?? null)
          : undefined,
});

const uniquenessRecord = { get: (key: string) => (key === 'exists' ? false : undefined) };

describe('ComponentService', () => {
  const setup = async (readImpl: jest.Mock, writeImpl: jest.Mock) => {
    const neo4j = { read: readImpl, write: writeImpl };
    const moduleRef = await Test.createTestingModule({
      providers: [ComponentService, { provide: Neo4jService, useValue: neo4j }],
    }).compile();
    return { service: moduleRef.get(ComponentService), neo4j };
  };

  describe('create', () => {
    const uniquenessRead = () => jest.fn().mockResolvedValueOnce({ records: [uniquenessRecord] });

    it('writes isPublic false on Component and ComponentVersion when omitted', async () => {
      const write = jest.fn().mockResolvedValue({
        records: [
          mkComponentRecord({
            id: 'c1',
            unitId: 't1',
            name: 'My Comp',
            description: null,
            type: 'component',
            isDependency: false,
            isPublic: false,
          }),
        ],
      });
      const { service } = await setup(uniquenessRead(), write);
      const result = await service.create({
        unitId: 't1',
        teamId: 'tm1',
        name: ' My Comp ',
        isDependency: false,
      });

      const query = write.mock.calls[0][0] as string;
      const params = write.mock.calls[0][1] as Record<string, unknown>;
      expect((query.match(/isPublic: \$isPublic/g) ?? []).length).toBe(2);
      expect(params.isPublic).toBe(false);
      expect(params.name).toBe('My Comp');
      expect(result?.isPublic).toBe(false);
    });

    it('writes isPublic true on Component and ComponentVersion when set', async () => {
      const write = jest.fn().mockResolvedValue({
        records: [
          mkComponentRecord({
            id: 'c1',
            unitId: 't1',
            name: 'Pub',
            description: null,
            type: 'component',
            isDependency: false,
            isPublic: true,
          }),
        ],
      });
      const { service } = await setup(uniquenessRead(), write);
      const result = await service.create({
        unitId: 't1',
        teamId: 'tm1',
        name: 'Pub',
        isDependency: false,
        isPublic: true,
      });

      const query = write.mock.calls[0][0] as string;
      const params = write.mock.calls[0][1] as Record<string, unknown>;
      expect((query.match(/isPublic: \$isPublic/g) ?? []).length).toBe(2);
      expect(params.isPublic).toBe(true);
      expect(result?.isPublic).toBe(true);
    });
  });

  describe('update', () => {
    const storedComponent = (description: string) => ({
      id: 'c1',
      unitId: 't1',
      name: 'Comp',
      description,
      type: 'component',
      isDependency: false,
      isPublic: false,
    });

    it('throws when name differs from stored', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [mkComponentRecord(storedComponent('Old'))],
      });
      const write = jest.fn().mockResolvedValue({ records: [] });
      const { service } = await setup(read, write);

      await expect(
        service.update('c1', { unitId: 't1', teamId: 'tm1', name: 'Other' }),
      ).rejects.toThrow('Component name is immutable');
      expect(write).not.toHaveBeenCalled();
    });

    it('accepts unchanged name and does not SET properties', async () => {
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkComponentRecord(storedComponent('Old'))] })
        .mockResolvedValueOnce({ records: [uniquenessRecord] })
        .mockResolvedValueOnce({ records: [mkComponentRecord(storedComponent('Old'))] });
      const write = jest.fn().mockResolvedValue({
        records: [{ get: (key: string) => (key === 'component' ? mkComponentNode(storedComponent('Old')) : undefined) }],
      });
      const { service } = await setup(read, write);

      const result = await service.update('c1', {
        unitId: 't1',
        teamId: 'tm1',
        name: '  Comp  ',
      });

      expect(result?.name).toBe('Comp');
      const combined = write.mock.calls.map((call) => String(call[0])).join('\n');
      expect(combined).not.toContain('SET');
    });

    it('does not write isDependency or type', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [mkComponentRecord(storedComponent('New'))],
      });
      const write = jest.fn().mockResolvedValue({
        records: [{ get: (key: string) => (key === 'component' ? mkComponentNode(storedComponent('New')) : undefined) }],
      });

      const { service } = await setup(read, write);
      await service.update('c1', { unitId: 't1', teamId: 'tm1', description: 'New' });

      const queries = write.mock.calls.map((call) => String(call[0]));
      const combined = queries.join('\n');
      expect(combined).not.toContain('isDependency');
      expect(combined).not.toContain('component.type');
    });

    it('replaces MAINTAINS in a single write', async () => {
      const read = jest.fn().mockResolvedValue({
        records: [mkComponentRecord(storedComponent('Desc'), { id: 'tm2', name: 'Other' })],
      });
      const write = jest.fn().mockResolvedValue({
        records: [{ get: (key: string) => (key === 'component' ? mkComponentNode(storedComponent('Desc')) : undefined) }],
      });
      const { service } = await setup(read, write);

      const result = await service.update('c1', { unitId: 't1', teamId: 'tm2' });

      expect(write).toHaveBeenCalledTimes(1);
      const query = String(write.mock.calls[0][0]);
      expect(query).toContain('DELETE maintains');
      expect(query).toContain('CREATE (team)-[:MAINTAINS]->(component)');
      expect(query).toContain('MATCH (team:Team {id: $teamId, unitId: $unitId})');
      expect(result?.team?.id).toBe('tm2');
    });

    it('throws BadRequestException when team is not found', async () => {
      const read = jest.fn();
      const write = jest.fn().mockResolvedValue({ records: [] });
      const { service } = await setup(read, write);

      await expect(service.update('c1', { unitId: 't1', teamId: 'missing' })).rejects.toEqual(
        new BadRequestException('Team not found'),
      );
      expect(write).toHaveBeenCalledTimes(1);
      expect(read).not.toHaveBeenCalled();
    });
  });
});
