import type { ViewEdge, ViewNode } from '@stellode/models';
import { annotateFeatureVersionCrossUnitHints } from './annotate-feature-version-cross-unit-hints';

const node = (
  id: string,
  dataType: string,
  label: string,
  extras: Partial<ViewNode['data']> = {},
  parentId?: string,
): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...(parentId !== undefined ? { parentId } : {}),
  data: { label, type: dataType, ...extras },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('annotateFeatureVersionCrossUnitHints', () => {
  it('when filter is off puts merged app/team arrays on local consumer', () => {
    const nodes: ViewNode[] = [
      node('fv', 'featureVersion', 'FV'),
      node('u2', 'unit', 'Unit2'),
      node('u3', 'unit', 'Unit3'),
      node('local', 'component', 'Local', { unitId: 'u1', sourceId: 'cv-local' }, 'a1'),
      node('a1', 'app', 'LocalApp', { unitId: 'u1' }),
      node('remote-a', 'component', 'RemoteA', { unitId: 'u2', sourceId: 'cv-a' }),
      node('app-a', 'app', 'AppA', { unitId: 'u2' }),
      node('team-a', 'team', 'TeamA', { unitId: 'u2' }),
      node('remote-b', 'component', 'RemoteB', { unitId: 'u3', sourceId: 'cv-b' }),
      node('app-b', 'app', 'AppB', { unitId: 'u3' }),
      node('team-b', 'team', 'TeamB', { unitId: 'u3' }),
    ];
    const edges: ViewEdge[] = [
      edge('uses', 'local', 'fv', 'USES_COMPONENT_VERSION'),
      {
        ...edge('dep-a', 'local', 'remote-a', 'DEPENDS_ON'),
        providerApplicationId: 'app-a',
      },
      {
        ...edge('dep-b', 'local', 'remote-b', 'DEPENDS_ON'),
        providerApplicationId: 'app-b',
      },
      edge('m-a', 'remote-a', 'team-a', 'MAINTAINS'),
      edge('m-b', 'remote-b', 'team-b', 'MAINTAINS'),
    ];

    const out = annotateFeatureVersionCrossUnitHints(nodes, edges, false, ['fv']);
    const hint = out.find((item) => item.id === 'local')?.data.crossUnitHint;
    expect(hint?.applicationName).toEqual(['AppA', 'AppB']);
    expect(hint?.componentName).toEqual(['RemoteA', 'RemoteB']);
    expect(hint?.teamName).toEqual(['TeamA', 'TeamB']);
    expect(hint?.unitName).toEqual(['Unit2', 'Unit3']);
    expect(out.find((item) => item.id === 'remote-a')?.data.crossUnitHint).toBeUndefined();
  });

  it('when filter is on puts hint with application on remote node', () => {
    const nodes: ViewNode[] = [
      node('fv', 'featureVersion', 'FV'),
      node('u2', 'unit', 'Unit2'),
      node('local', 'component', 'Local', { unitId: 'u1', sourceId: 'cv-local' }, 'a1'),
      node('a1', 'app', 'LocalApp', { unitId: 'u1' }),
      node('remote', 'component', 'Remote', { unitId: 'u2', sourceId: 'cv-r' }, 'app-r'),
      node('app-r', 'app', 'RemoteApp', { unitId: 'u2' }),
      node('team-r', 'team', 'RemoteTeam', { unitId: 'u2' }),
    ];
    const edges: ViewEdge[] = [
      edge('uses', 'local', 'fv', 'USES_COMPONENT_VERSION'),
      {
        ...edge('dep', 'local', 'remote', 'DEPENDS_ON'),
        providerApplicationId: 'app-r',
      },
      edge('m', 'remote', 'team-r', 'MAINTAINS'),
    ];
    const out = annotateFeatureVersionCrossUnitHints(nodes, edges, true, ['fv']);
    expect(out.find((item) => item.id === 'remote')?.data.crossUnitHint).toEqual({
      unitName: 'Unit2',
      teamName: 'RemoteTeam',
      applicationName: 'RemoteApp',
      componentName: 'Remote',
      featureName: '—',
      serviceName: '—',
    });
    expect(out.find((item) => item.id === 'local')?.data.crossUnitHint).toBeUndefined();
  });
});
