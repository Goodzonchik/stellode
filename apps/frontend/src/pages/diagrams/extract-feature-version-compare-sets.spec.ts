import type { ArchitectureGraph } from '@stellode/models';
import { extractFeatureVersionCompareSets } from './extract-feature-version-compare-sets';
import { compositionCompareKey, dependsOnCompareKey } from './feature-version-compare-sets';

const graph = (
  nodes: ArchitectureGraph['nodes'],
  relationships: ArchitectureGraph['relationships'],
): ArchitectureGraph => ({ nodes, relationships });

describe('extractFeatureVersionCompareSets', () => {
  it('collects composition, DEPENDS_ON, applications and units', () => {
    const sets = extractFeatureVersionCompareSets(
      graph(
        [
          {
            id: 'app-1',
            labels: ['Application'],
            type: 'application',
            name: 'App',
          },
          { id: 'u-1', labels: ['Unit'], type: 'unit', name: 'U' },
          {
            id: 'cv-1',
            labels: ['ComponentVersion'],
            type: 'componentVersion',
            name: 'C',
          },
          {
            id: 'cv-2',
            labels: ['ComponentVersion'],
            type: 'componentVersion',
            name: 'D',
          },
        ],
        [
          {
            id: 'uses-1',
            type: 'USES_COMPONENT_VERSION',
            from: 'fv-1',
            to: 'cv-1',
            properties: { applicationId: 'app-1' },
          },
          {
            id: 'dep-1',
            type: 'DEPENDS_ON',
            from: 'cv-1',
            to: 'cv-2',
          },
          {
            id: 'maintains-1',
            type: 'MAINTAINS',
            from: 'team-1',
            to: 'c-1',
          },
        ],
      ),
    );
    expect([...sets.composition]).toEqual([compositionCompareKey('cv-1', 'app-1')]);
    expect([...sets.dependsOn]).toEqual([dependsOnCompareKey('cv-1', 'cv-2')]);
    expect([...sets.applications]).toEqual(['app-1']);
    expect([...sets.units]).toEqual(['u-1']);
  });

  it('skips USES without applicationId', () => {
    const sets = extractFeatureVersionCompareSets(
      graph(
        [],
        [
          {
            id: 'uses-1',
            type: 'USES_COMPONENT_VERSION',
            from: 'fv-1',
            to: 'cv-1',
          },
        ],
      ),
    );
    expect(sets.composition.size).toBe(0);
  });
});
