import type { ArchitectureGraph } from '@stellode/models';
import { featureDiagramCenterFeatureVersionId } from './feature-diagram-center-feature-version-id';

describe('featureDiagramCenterFeatureVersionId', () => {
  it('prefers HAS_DRAFT over HAS_VERSION', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'f1', labels: ['Feature'], type: 'feature', name: 'F' },
        { id: 'fv-draft', labels: ['FeatureVersion'], type: 'featureVersion', name: 'D' },
        { id: 'fv-2', labels: ['FeatureVersion'], type: 'featureVersion', name: 'V2' },
      ],
      relationships: [
        { id: 'r1', type: 'HAS_DRAFT', from: 'f1', to: 'fv-draft' },
        { id: 'r2', type: 'HAS_VERSION', from: 'f1', to: 'fv-2' },
      ],
    };
    expect(featureDiagramCenterFeatureVersionId(graph, 'f1')).toBe('fv-draft');
  });

  it('returns FeatureVersion with max versionNumber when no draft', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { id: 'f1', labels: ['Feature'], type: 'feature', name: 'F' },
        {
          id: 'fv-1',
          labels: ['FeatureVersion'],
          type: 'featureVersion',
          name: 'V1',
          versionNumber: 1,
        },
        {
          id: 'fv-3',
          labels: ['FeatureVersion'],
          type: 'featureVersion',
          name: 'V3',
          versionNumber: 3,
        },
      ],
      relationships: [
        { id: 'r1', type: 'HAS_VERSION', from: 'f1', to: 'fv-1' },
        { id: 'r2', type: 'HAS_VERSION', from: 'f1', to: 'fv-3' },
      ],
    };
    expect(featureDiagramCenterFeatureVersionId(graph, 'f1')).toBe('fv-3');
  });

  it('returns null when feature has no versions', () => {
    const graph: ArchitectureGraph = {
      nodes: [{ id: 'f1', labels: ['Feature'], type: 'feature', name: 'F' }],
      relationships: [],
    };
    expect(featureDiagramCenterFeatureVersionId(graph, 'f1')).toBeNull();
  });
});
