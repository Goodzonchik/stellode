import type { ViewNode } from '@stellode/models';
import { getLegend } from './get-legend';

const node = (id: string, dataType: string, label = id): ViewNode =>
  ({
    id,
    type: 'custom',
    draggable: true,
    position: { x: 0, y: 0 },
    data: { label, type: dataType },
  }) satisfies ViewNode;

describe('getLegend', () => {
  it('collects applications, features and services; skips units and teams', () => {
    const legend = getLegend(
      [
        node('u1', 'unit', 'Unit A'),
        node('tm1', 'team', 'Team A'),
        node('app1', 'application', 'App A'),
        node('app2', 'app', 'App B'),
        node('f1', 'feature', 'Feat'),
        node('s1', 'service', 'Svc'),
        node('c1', 'component', 'Comp'),
      ],
      'u1',
    );
    expect(legend.application.map((item) => item.id)).toEqual(['app1', 'app2']);
    expect(legend.features.map((item) => item.name)).toEqual(['Feat']);
    expect(legend.services.map((item) => item.name)).toEqual(['Svc']);
  });

  it('skips hidden nodes', () => {
    const hiddenService: ViewNode = {
      ...node('s1', 'service', 'HiddenSvc'),
      hidden: true,
    };
    const legend = getLegend([hiddenService, node('s2', 'service', 'VisibleSvc')], undefined);
    expect(legend.services.map((item) => item.name)).toEqual(['VisibleSvc']);
  });
});
