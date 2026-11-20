import type { ViewEdge, ViewNode } from '@stellode/models';
import { applyCrossUnitBridgeVisibility } from './apply-cross-unit-bridge-visibility';

const viewNode = (id: string, type: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type },
});

const edge = (id: string, source: string, target: string, relationshipType: string): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('applyCrossUnitBridgeVisibility', () => {
  const nodes = [
    viewNode('unit', 'unit'),
    viewNode('team', 'team'),
    viewNode('svc', 'service'),
    viewNode('feat', 'feature'),
    viewNode('app', 'app'),
    viewNode('comp', 'component'),
  ];
  const edges = [
    edge('maintains', 'team', 'comp', 'MAINTAINS'),
    edge('agg', 'svc', 'feat', 'AGGREGATES'),
    edge('uses', 'feat', 'comp', 'USES'),
  ];

  it('keeps all nodes when teams visible and codeOnly off', () => {
    const out = applyCrossUnitBridgeVisibility(nodes, edges, {
      teamsVisible: true,
      codeOnly: false,
    });
    expect(out.nodes).toHaveLength(6);
    expect(out.edges).toHaveLength(3);
  });

  it('hides teams when teamsVisible is false', () => {
    const out = applyCrossUnitBridgeVisibility(nodes, edges, {
      teamsVisible: false,
      codeOnly: false,
    });
    expect(out.nodes.map((node) => node.id)).toEqual([
      'unit',
      'svc',
      'feat',
      'app',
      'comp',
    ]);
    expect(out.edges.map((item) => item.id)).toEqual(['agg', 'uses']);
  });

  it('hides service and feature when codeOnly is on', () => {
    const out = applyCrossUnitBridgeVisibility(nodes, edges, {
      teamsVisible: true,
      codeOnly: true,
    });
    expect(out.nodes.map((node) => node.id)).toEqual([
      'unit',
      'team',
      'app',
      'comp',
    ]);
    expect(out.edges.map((item) => item.id)).toEqual(['maintains']);
  });

  it('keeps Application component copies when Feature is filtered after grouping', () => {
    const grouped = [
      viewNode('unit', 'unit'),
      viewNode('feat', 'feature'),
      viewNode('app', 'app'),
      {
        ...viewNode('app::comp', 'component'),
        parentId: 'app',
        extent: 'parent' as const,
        data: {
          label: 'comp',
          type: 'component',
          sourceId: 'comp',
          applicationId: 'app',
        },
      },
    ];
    const groupedEdges = [
      edge('uses', 'feat', 'app::comp', 'USES'),
      edge('dep', 'app::comp', 'other', 'DEPENDS_ON'),
    ];
    const out = applyCrossUnitBridgeVisibility(grouped, groupedEdges, {
      teamsVisible: true,
      codeOnly: true,
    });
    expect(out.nodes.map((node) => node.id)).toEqual(['unit', 'app', 'app::comp']);
    expect(out.edges.map((item) => item.id)).toEqual([]);
  });
});
