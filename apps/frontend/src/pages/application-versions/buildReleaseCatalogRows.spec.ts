import { VersionStatus } from '@stellode/models';
import { buildReleaseCatalogRows } from './buildReleaseCatalogRows';
import type { UnitComponentCatalog } from './releaseWizardCatalog';
import type { ReleaseComponentRow } from './releaseWizardTypes';

const catalogRow = (
  componentId: string,
  versions: UnitComponentCatalog['versions'],
): UnitComponentCatalog => ({
  component: { id: componentId, name: componentId },
  team: { id: 't1', name: 'Team' },
  versions,
});

const compositionRow = (
  componentId: string,
  versionId: string,
  versionNumber: number,
): ReleaseComponentRow => ({
  component: { id: componentId, name: componentId },
  team: null,
  componentVersion: {
    id: versionId,
    componentId,
    version: String(versionNumber),
    versionNumber,
    status: VersionStatus.Active,
  },
  applicationStatus: 'active',
  otherApplications: [],
  hasNewerVersion: false,
  newerVersions: [],
});

describe('buildReleaseCatalogRows', () => {
  it('omits components without eligible versions', () => {
    const catalog = [
      catalogRow('c1', [
        {
          id: 'v1',
          version: '1',
          versionNumber: 1,
          status: VersionStatus.Active,
        },
      ]),
    ];
    const rows = buildReleaseCatalogRows(catalog, [compositionRow('c1', 'v1', 1)]);
    expect(rows).toEqual([]);
  });

  it('includes later draft to add second line for component in composition', () => {
    const catalog = [
      catalogRow('c1', [
        {
          id: 'v1',
          version: '1',
          versionNumber: 1,
          status: VersionStatus.Active,
        },
        {
          id: 'v2',
          version: '2',
          versionNumber: 2,
          status: VersionStatus.Draft,
        },
      ]),
    ];
    const rows = buildReleaseCatalogRows(catalog, [compositionRow('c1', 'v1', 1)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].defaultComponentVersionId).toBe('v2');
    expect(rows[0].eligible.map((item) => item.id)).toEqual(['v2']);
  });

  it('includes component outside composition with eligible versions', () => {
    const catalog = [
      catalogRow('c2', [
        {
          id: 'v2',
          version: '2',
          versionNumber: 2,
          status: VersionStatus.Draft,
        },
        {
          id: 'v1',
          version: '1',
          versionNumber: 1,
          status: VersionStatus.Active,
        },
      ]),
    ];
    const rows = buildReleaseCatalogRows(catalog, [compositionRow('c1', 'v9', 1)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].component.id).toBe('c2');
    expect(rows[0].defaultComponentVersionId).toBe('v2');
    expect(rows[0].eligible.map((item) => item.id)).toEqual(['v2', 'v1']);
  });
});
