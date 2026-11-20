import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Neo4jService } from '../neo4j/neo4j.service';
import { StatusWarningService } from './status-warning.service';

const mkRecord = (fields: Record<string, unknown>) => ({
  get: (key: string) => fields[key],
});

describe('StatusWarningService', () => {
  const setup = async (read: jest.Mock) => {
    const moduleRef = await Test.createTestingModule({
      providers: [StatusWarningService, { provide: Neo4jService, useValue: { read } }],
    }).compile();
    return {
      service: moduleRef.get(StatusWarningService),
      neo4j: moduleRef.get(Neo4jService) as { read: jest.Mock },
    };
  };

  describe('candidatesForApplication', () => {
    it('throws when application missing', async () => {
      const read = jest.fn().mockResolvedValueOnce({ records: [] });
      const { service } = await setup(read);
      await expect(service.candidatesForApplication('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns deprecated and unactive candidates without duplicates', async () => {
      const read = jest
        .fn()
        .mockResolvedValueOnce({ records: [mkRecord({ id: 'app1' })] })
        .mockResolvedValueOnce({
          records: [
            mkRecord({
              componentVersionId: 'cv1',
              componentId: 'c1',
              componentName: 'Mail',
              version: '1',
              status: 'deprecated',
            }),
            mkRecord({
              componentVersionId: 'cv2',
              componentId: 'c2',
              componentName: 'Notify',
              version: '3',
              status: 'unactive',
            }),
            mkRecord({
              componentVersionId: 'cv1',
              componentId: 'c1',
              componentName: 'Mail',
              version: '1',
              status: 'deprecated',
            }),
          ],
        });
      const { service, neo4j } = await setup(read);
      const rows = await service.candidatesForApplication('app1');
      expect(rows).toEqual([
        {
          componentVersionId: 'cv1',
          componentId: 'c1',
          componentName: 'Mail',
          version: '1',
          status: 'deprecated',
        },
        {
          componentVersionId: 'cv2',
          componentId: 'c2',
          componentName: 'Notify',
          version: '3',
          status: 'unactive',
        },
      ]);
      const candidatesQuery = neo4j.read.mock.calls[1][0] as string;
      expect(candidatesQuery).toContain("status: 'deprecated'");
      expect(candidatesQuery).toContain("status: 'unactive'");
      expect(candidatesQuery).toContain('USES_COMPONENT_VERSION');
    });
  });

  describe('statusWarningForComponentVersion', () => {
    it('throws when component version missing', async () => {
      const read = jest.fn().mockResolvedValueOnce({ records: [] });
      const { service } = await setup(read);
      await expect(service.statusWarningForComponentVersion('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('aggregates applications teams neighbors features services', async () => {
      const read = jest
        .fn()
        .mockResolvedValueOnce({
          records: [
            mkRecord({
              componentVersionId: 'cv1',
              componentId: 'c1',
              componentName: 'Mail',
              version: '1',
              status: 'deprecated',
            }),
          ],
        })
        .mockResolvedValueOnce({
          records: [
            mkRecord({
              componentVersionId: 'cv2',
              componentId: 'c2',
              componentName: 'Notify',
              version: '2',
              status: 'active',
              direction: 'outgoing',
            }),
          ],
        })
        .mockResolvedValueOnce({
          records: [mkRecord({ id: 'app1', name: 'Portal' })],
        })
        .mockResolvedValueOnce({
          records: [mkRecord({ id: 'team1', name: 'Core' })],
        })
        .mockResolvedValueOnce({
          records: [
            mkRecord({
              featureId: 'f1',
              featureName: 'Send',
              versionId: 'fv1',
              version: '1',
              status: 'draft',
            }),
          ],
        })
        .mockResolvedValueOnce({
          records: [mkRecord({ id: 's1', name: 'Notifications' })],
        });
      const { service } = await setup(read);
      const result = await service.statusWarningForComponentVersion('cv1');
      expect(result).toMatchObject({
        componentVersionId: 'cv1',
        componentName: 'Mail',
        status: 'deprecated',
        applications: [{ id: 'app1', name: 'Portal' }],
        teams: [{ id: 'team1', name: 'Core' }],
        components: [
          {
            componentVersionId: 'cv2',
            componentName: 'Notify',
            direction: 'outgoing',
            status: 'active',
          },
        ],
        features: [{ id: 'f1', name: 'Send', status: 'draft' }],
        services: [{ id: 's1', name: 'Notifications' }],
      });
    });
  });
});
