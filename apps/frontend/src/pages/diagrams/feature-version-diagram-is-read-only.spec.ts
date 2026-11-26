import {
  VersionStatus,
  type ArchitectureGraph,
  type VersionStatus as VersionStatusType,
} from '@stellode/models';
import { featureVersionDiagramIsReadOnly } from './feature-version-diagram-is-read-only';

const mkGraph = (fvStatus: VersionStatusType): ArchitectureGraph => ({
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
    expect(
      featureVersionDiagramIsReadOnly('feature', 'fv-1', mkGraph(VersionStatus.Active)),
    ).toBe(false);
  });

  it('returns false when graph or anchor is missing', () => {
    expect(
      featureVersionDiagramIsReadOnly(
        'feature-version',
        undefined,
        mkGraph(VersionStatus.Active),
      ),
    ).toBe(false);
    expect(featureVersionDiagramIsReadOnly('feature-version', 'fv-1', null)).toBe(false);
  });

  it('returns true for non-draft anchor', () => {
    expect(
      featureVersionDiagramIsReadOnly(
        'feature-version',
        'fv-1',
        mkGraph(VersionStatus.Active),
      ),
    ).toBe(true);
    expect(
      featureVersionDiagramIsReadOnly(
        'feature-version',
        'fv-1',
        mkGraph(VersionStatus.Unactive),
      ),
    ).toBe(true);
    expect(
      featureVersionDiagramIsReadOnly(
        'feature-version',
        'fv-1',
        mkGraph(VersionStatus.Deprecated),
      ),
    ).toBe(true);
  });

  it('returns false for draft', () => {
    expect(
      featureVersionDiagramIsReadOnly('feature-version', 'fv-1', mkGraph(VersionStatus.Draft)),
    ).toBe(false);
  });
});
