import {
  DIAGRAM_LAYER_ORDERS,
  orientGraphByLayerOrder,
  type ArchitectureGraph,
} from '@stellode/models';

describe('orientGraphByLayerOrder', () => {
  it('reverses MAINTAINS Team→Component so LR layout flows Application…→Team', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'team1', labels: ['Team'], type: 'team', name: 'Team' },
        { id: 'comp1', labels: ['Component'], type: 'component', name: 'Comp' },
      ],
      relationships: [{ id: 'rel1', type: 'MAINTAINS', from: 'team1', to: 'comp1' }],
    };
    const oriented = orientGraphByLayerOrder(graph, DIAGRAM_LAYER_ORDERS.application);
    expect(oriented.relationships[0]).toEqual({
      id: 'rel1',
      type: 'MAINTAINS',
      from: 'comp1',
      to: 'team1',
    });
  });

  it('reverses USES FeatureVersion→ComponentVersion on feature order (Component before Feature)', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        {
          id: 'fv1',
          labels: ['FeatureVersion'],
          type: 'featureVersion',
          name: 'FV',
        },
        {
          id: 'cv1',
          labels: ['ComponentVersion'],
          type: 'componentVersion',
          name: 'CV',
        },
      ],
      relationships: [
        { id: 'uses1', type: 'USES_COMPONENT_VERSION', from: 'fv1', to: 'cv1' },
      ],
    };
    const oriented = orientGraphByLayerOrder(graph, DIAGRAM_LAYER_ORDERS.feature);
    expect(oriented.relationships[0]).toEqual({
      id: 'uses1',
      type: 'USES_COMPONENT_VERSION',
      from: 'cv1',
      to: 'fv1',
    });
  });

  it('reverses AGGREGATES Service→Feature to Feature→Service on feature order', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'svc1', labels: ['Service'], type: 'service', name: 'Svc' },
        { id: 'f1', labels: ['Feature'], type: 'feature', name: 'Feat' },
      ],
      relationships: [{ id: 'ag1', type: 'AGGREGATES', from: 'svc1', to: 'f1' }],
    };
    const oriented = orientGraphByLayerOrder(graph, DIAGRAM_LAYER_ORDERS.feature);
    expect(oriented.relationships[0]).toEqual({
      id: 'ag1',
      type: 'AGGREGATES',
      from: 'f1',
      to: 'svc1',
    });
  });
});
