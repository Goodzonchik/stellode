import type { ArchitectureGraph } from '@stellode/models';
import { featureVersionDiagramIsReadOnly } from './feature-version-diagram-is-read-only';

const mkGraph = (fvStatus: string): ArchitectureGraph => ({
  nodes: [
    {
      id: 'fv-1',
      name: 'F',
      type: 'featureVersion',
      labels: ['FeatureVersion'],
      status: fvStatus,
    },
  ],
  relationships: [],
});

describe('featureVersionDiagramIsReadOnly', () => {
  it('returns false when not feature-version route', () => {
    expect(featureVersionDiagramIsReadOnly('feature', 'fv-1', mkGraph('active'))).toBe(false);
  });

  it('returns false when graph or anchor is missing', () => {
    expect(featureVersionDiagramIsReadOnly('feature-version', undefined, mkGraph('active'))).toBe(
      false,
    );
    expect(featureVersionDiagramIsReadOnly('feature-version', 'fv-1', null)).toBe(false);
  });

  it('returns true for non-draft anchor', () => {
    expect(featureVersionDiagramIsReadOnly('feature-version', 'fv-1', mkGraph('active'))).toBe(
      true,
    );
    expect(featureVersionDiagramIsReadOnly('feature-version', 'fv-1', mkGraph('unactive'))).toBe(
      true,
    );
    expect(
      featureVersionDiagramIsReadOnly('feature-version', 'fv-1', mkGraph('deprecated')),
    ).toBe(true);
  });

  it('returns false for draft', () => {
    expect(featureVersionDiagramIsReadOnly('feature-version', 'fv-1', mkGraph('draft'))).toBe(
      false,
    );
  });
});
