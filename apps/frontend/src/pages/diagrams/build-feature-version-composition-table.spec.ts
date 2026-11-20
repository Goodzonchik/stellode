import type { ViewEdge, ViewNode } from '@stellode/models';
import { buildFeatureVersionCompositionTable } from './build-feature-version-composition-table';

const node = (
  id: string,
  type: string,
  data: Partial<ViewNode['data']> = {},
  parentId?: string,
): ViewNode => ({
  id,
  type: type === 'app' ? 'group' : 'custom',
    draggable: true,
    position: { x: 0, y: 0 },
  data: { label: data.label ?? id, type, ...data },
  ...(parentId !== undefined ? { parentId } : {}),
});

const edge = (partial: Partial<ViewEdge> & Pick<ViewEdge, 'id' | 'source' | 'target' | 'relationshipType'>): ViewEdge => ({
  type: 'default',
  ...partial,
});

describe('buildFeatureVersionCompositionTable', () => {
  const app = node('app-1', 'app', { label: 'Billing', actualVersion: '1.2' });
  const component = node(
    'cv-copy',
    'component',
    {
      label: 'InvoiceApi',
      actualVersion: '3',
      sourceId: 'cv-1',
      applicationId: 'app-1',
      unitId: 'unit-1',
    },
    'app-1',
  );

  it('groups own components by application caption', () => {
    const table = buildFeatureVersionCompositionTable({
      nodes: [app, component, node('team-1', 'team', { label: 'Payments' })],
      edges: [
        edge({
          id: 'm',
          source: 'team-1',
          target: 'cv-copy',
          relationshipType: 'MAINTAINS',
        }),
      ],
      homeUnitId: 'unit-1',
      crossUnitLinksVisible: false,
    });

    expect(table.foreignBlocks).toEqual([]);
    expect(table.ownGroups).toEqual([
      {
        applicationId: 'app-1',
        title: 'Billing · 1.2',
        rows: [
          {
            key: 'app-1::cv-1',
            componentVersionId: 'cv-1',
            applicationId: 'app-1',
            componentName: 'InvoiceApi',
            version: '3',
            teamLabel: 'Payments',
            flat: false,
          },
        ],
      },
    ]);
  });

  it('joins several team names and uses a dash when there is no team', () => {
    const alone = node(
      'cv-2',
      'component',
      { label: 'Pdf', actualVersion: '1', applicationId: 'app-1', unitId: 'unit-1' },
      'app-1',
    );
    const table = buildFeatureVersionCompositionTable({
      nodes: [
        app,
        component,
        alone,
        node('team-1', 'team', { label: 'Payments' }),
        node('team-2', 'team', { label: 'Billing' }),
      ],
      edges: [
        edge({ id: 'm1', source: 'team-1', target: 'cv-copy', relationshipType: 'MAINTAINS' }),
        edge({ id: 'm2', source: 'team-2', target: 'cv-copy', relationshipType: 'MAINTAINS' }),
      ],
      homeUnitId: 'unit-1',
      crossUnitLinksVisible: false,
    });
    expect(table.ownGroups[0]?.rows.map((row) => row.teamLabel)).toEqual([
      'Payments, Billing',
      '—',
    ]);
  });

  it('puts a foreign provider under a unit separator with service and feature fields', () => {
    const remote = node(
      'cv-r',
      'component',
      {
        label: 'SendEmail',
        actualVersion: '1',
        applicationId: 'app-r',
        unitId: 'unit-2',
        sourceId: 'cv-r',
      },
      'app-r',
    );
    const table = buildFeatureVersionCompositionTable({
      nodes: [app, component, node('app-r', 'app', { label: 'Mailer', actualVersion: '2' }), remote],
      edges: [
        edge({
          id: 'd',
          source: 'cv-copy',
          target: 'cv-r',
          relationshipType: 'DEPENDS_ON',
          providerServiceId: 'svc-2',
          providerFeatureId: 'feat-2',
        }),
      ],
      homeUnitId: 'unit-1',
      crossUnitLinksVisible: true,
      namesById: new Map([
        ['unit-2', 'CoolUnit2'],
        ['svc-2', 'Notifications'],
        ['feat-2', 'SendEmail'],
      ]),
    });

    expect(table.ownGroups[0]?.rows).toHaveLength(1);
    expect(table.foreignBlocks).toEqual([
      {
        key: 'unit-2::svc-2::feat-2::Notifications::SendEmail',
        unitName: 'CoolUnit2',
        serviceName: 'Notifications',
        featureName: 'SendEmail',
        groups: [
          {
            applicationId: 'app-r',
            title: 'Mailer · 2',
            rows: [
              {
                key: 'app-r::cv-r',
                componentVersionId: 'cv-r',
                applicationId: 'app-r',
                componentName: 'SendEmail',
                version: '1',
                teamLabel: '—',
                flat: false,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('hides foreign rows while cross-unit is off and keeps compare status', () => {
    const remote = node(
      'cv-r',
      'component',
      { label: 'SendEmail', actualVersion: '1', applicationId: 'app-r', unitId: 'unit-2' },
      'app-r',
    );
    const added = node(
      'cv-copy',
      'component',
      {
        label: 'InvoiceApi',
        actualVersion: '3',
        sourceId: 'cv-1',
        applicationId: 'app-1',
        unitId: 'unit-1',
        diffStatus: 'added',
      },
      'app-1',
    );
    const table = buildFeatureVersionCompositionTable({
      nodes: [app, added, remote],
      edges: [],
      homeUnitId: 'unit-1',
      crossUnitLinksVisible: false,
    });
    expect(table.foreignBlocks).toEqual([]);
    expect(table.ownGroups[0]?.rows[0]?.diffStatus).toBe('added');
  });
});
