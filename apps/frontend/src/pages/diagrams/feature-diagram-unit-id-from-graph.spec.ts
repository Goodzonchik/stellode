import type { ArchitectureGraph } from '@stellode/models';
import { featureDiagramUnitIdFromGraph } from './feature-diagram-unit-id-from-graph';

describe('featureDiagramUnitIdFromGraph', () => {
  const graphForFeatureVersion = (fvId: string): ArchitectureGraph => ({
    nodes: [
      {
        id: 'feat-1',
        labels: ['Feature'],
        type: 'feature',
        name: 'F',
        unitId: 'unit-a',
      },
      {
        id: fvId,
        labels: ['FeatureVersion'],
        type: 'featureVersion',
        name: 'F',
        status: 'draft',
      },
    ],
    relationships: [{ id: 'e1', type: 'HAS_DRAFT', from: 'feat-1', to: fvId }],
  });

  it('возвращает unitId Feature по связи HAS_DRAFT с версией фичи', () => {
    expect(
      featureDiagramUnitIdFromGraph(
        graphForFeatureVersion('fv-1'),
        'feature-version',
        'fv-1',
      ),
    ).toBe('unit-a');
  });

  it('поддерживает развёрнутое HAS_VERSION (FeatureVersion → Feature)', () => {
    const g = graphForFeatureVersion('fv-2');
    g.relationships = [{ id: 'e1', type: 'HAS_VERSION', from: 'fv-2', to: 'feat-1' }];
    expect(featureDiagramUnitIdFromGraph(g, 'feature-version', 'fv-2')).toBe('unit-a');
  });

  it('возвращает undefined без графа или без unitId на Feature', () => {
    expect(featureDiagramUnitIdFromGraph(null, 'feature-version', 'fv')).toBeUndefined();
    const noUnit: ArchitectureGraph = {
      nodes: [
        { id: 'feat-1', labels: ['Feature'], type: 'feature', name: 'F' },
        {
          id: 'fv-1',
          labels: ['FeatureVersion'],
          type: 'featureVersion',
          name: 'F',
          status: 'draft',
        },
      ],
      relationships: [{ id: 'e1', type: 'HAS_DRAFT', from: 'feat-1', to: 'fv-1' }],
    };
    expect(
      featureDiagramUnitIdFromGraph(noUnit, 'feature-version', 'fv-1'),
    ).toBeUndefined();
  });
});
