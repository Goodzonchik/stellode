import type { ArchitectureGraph } from '@stellode/models';
import { resolveFeatureOverviewDependsOnConnect } from './resolve-feature-overview-depends-on-connect';

describe('resolveFeatureOverviewDependsOnConnect', () => {
  const baseGraph = (): ArchitectureGraph => ({
    nodes: [
      { id: 'f1', labels: ['Feature'], type: 'feature', name: 'F' },
      { id: 'fv1', labels: ['FeatureVersion'], type: 'featureVersion', name: 'FV' },
      { id: 'c1', labels: ['Component'], type: 'component', name: 'A' },
      { id: 'c2', labels: ['Component'], type: 'component', name: 'B' },
      { id: 'cv1', labels: ['ComponentVersion'], type: 'componentVersion', name: 'CV1' },
      { id: 'cv2', labels: ['ComponentVersion'], type: 'componentVersion', name: 'CV2' },
    ],
    relationships: [
      { id: 'hv1', type: 'HAS_VERSION', from: 'f1', to: 'fv1' },
      { id: 'hc1', type: 'HAS_VERSION', from: 'c1', to: 'cv1' },
      { id: 'hc2', type: 'HAS_VERSION', from: 'c2', to: 'cv2' },
      { id: 'uses1', type: 'USES_COMPONENT_VERSION', from: 'fv1', to: 'cv1' },
      { id: 'uses2', type: 'USES_COMPONENT_VERSION', from: 'fv1', to: 'cv2' },
    ],
  });

  const flowNodes = [
    { id: 'c1', data: { type: 'component' } },
    { id: 'c2', data: { type: 'component' } },
  ];

  it('maps two merged components to single USES ComponentVersions', () => {
    const graph = baseGraph();
    expect(
      resolveFeatureOverviewDependsOnConnect(graph, 'f1', 'c1', 'c2', flowNodes),
    ).toEqual({
      kind: 'direct',
      consumerCvId: 'cv1',
      providerCvId: 'cv2',
    });
  });

  it('returns null when multiple USES per component', () => {
    const graph = baseGraph();
    graph.nodes.push({
      id: 'cv1b',
      labels: ['ComponentVersion'],
      type: 'componentVersion',
      name: 'CV1b',
    });
    graph.relationships.push(
      { id: 'hc1b', type: 'HAS_VERSION', from: 'c1', to: 'cv1b' },
      { id: 'uses1b', type: 'USES_COMPONENT_VERSION', from: 'fv1', to: 'cv1b' },
    );
    expect(resolveFeatureOverviewDependsOnConnect(graph, 'f1', 'c1', 'c2', flowNodes)).toBeNull();
  });

  it('returns direct for two componentVersion nodes', () => {
    const graph = baseGraph();
    const cvNodes = [
      { id: 'cv1', data: { type: 'componentVersion' } },
      { id: 'cv2', data: { type: 'componentVersion' } },
    ];
    expect(
      resolveFeatureOverviewDependsOnConnect(graph, 'f1', 'cv1', 'cv2', cvNodes),
    ).toEqual({ kind: 'direct', consumerCvId: 'cv1', providerCvId: 'cv2' });
  });

  it('returns direct for projected component nodes whose ids are ComponentVersions', () => {
    const graph = baseGraph();
    const projected = [
      { id: 'cv1', data: { type: 'component' } },
      { id: 'cv2', data: { type: 'component' } },
    ];
    expect(
      resolveFeatureOverviewDependsOnConnect(graph, 'f1', 'cv1', 'cv2', projected),
    ).toEqual({ kind: 'direct', consumerCvId: 'cv1', providerCvId: 'cv2' });
  });

  it('maps merged components when USES edges are oriented toward FeatureVersion', () => {
    const graph = baseGraph();
    graph.relationships = graph.relationships.filter((r) => r.type !== 'USES_COMPONENT_VERSION');
    graph.relationships.push(
      { id: 'uses1', type: 'USES_COMPONENT_VERSION', from: 'cv1', to: 'fv1' },
      { id: 'uses2', type: 'USES_COMPONENT_VERSION', from: 'cv2', to: 'fv1' },
    );
    expect(
      resolveFeatureOverviewDependsOnConnect(graph, 'f1', 'c1', 'c2', flowNodes),
    ).toEqual({
      kind: 'direct',
      consumerCvId: 'cv1',
      providerCvId: 'cv2',
    });
  });
});
