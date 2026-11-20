import type { ArchitectureGraph } from '@stellode/models';
import { buildDiagramPageHeading } from './build-diagram-entity-heading';

const featureVersionGraph = (): ArchitectureGraph => ({
  nodes: [
    {
      id: 'f1',
      labels: ['Feature'],
      type: 'feature',
      name: 'Checkout',
    },
    {
      id: 'fv1',
      labels: ['FeatureVersion'],
      type: 'featureVersion',
      name: '1.2.0',
      version: '1.2.0',
      versionNumber: 2,
      status: 'active',
    },
  ],
  relationships: [{ id: 'r1', type: 'HAS_VERSION', from: 'f1', to: 'fv1' }],
});

describe('buildDiagramPageHeading', () => {
  it('formats feature-version as Фича Name Version (status)', () => {
    expect(
      buildDiagramPageHeading({
        kind: 'entityRoute',
        entity: 'feature-version',
        diagramAnchorId: 'fv1',
        archGraph: featureVersionGraph(),
        fallbackTitle: 'Diagram',
      }),
    ).toBe('Фича Checkout 1.2.0 (Активна)');
  });
});
