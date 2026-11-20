import type { ArchitectureGraph } from '@stellode/models';
import { parentFeatureElementIdFromGraph } from './parent-feature-element-id-from-graph';

describe('parentFeatureElementIdFromGraph', () => {
  it('returns Feature id from HAS_DRAFT toward FeatureVersion', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'f1', labels: ['Feature'], type: 'feature', name: 'F' },
        { id: 'fv1', labels: ['FeatureVersion'], type: 'featureVersion', name: 'FV' },
      ],
      relationships: [{ id: 'r1', type: 'HAS_DRAFT', from: 'f1', to: 'fv1', properties: {} }],
    };
    expect(parentFeatureElementIdFromGraph(graph, 'fv1')).toBe('f1');
  });

  it('returns Feature id when HAS_VERSION was oriented FeatureVersion → Feature', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'f1', labels: ['Feature'], type: 'feature', name: 'F' },
        { id: 'fv1', labels: ['FeatureVersion'], type: 'featureVersion', name: 'FV' },
      ],
      relationships: [{ id: 'r1', type: 'HAS_VERSION', from: 'fv1', to: 'f1', properties: {} }],
    };
    expect(parentFeatureElementIdFromGraph(graph, 'fv1')).toBe('f1');
  });

  it('returns null when no parent link', () => {
    const graph: ArchitectureGraph = { nodes: [], relationships: [] };
    expect(parentFeatureElementIdFromGraph(graph, 'fv1')).toBeNull();
  });
});
