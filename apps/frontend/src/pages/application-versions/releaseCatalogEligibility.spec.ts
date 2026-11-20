import { VersionStatus } from '@stellode/models';
import {
  defaultVersionId,
  eligibleBumpVersions,
  eligibleVersionsForComponent,
  uniqueTeamFilterOptions,
  type CatalogVersionCandidate,
} from './releaseCatalogEligibility';

const version = (
  partial: Partial<CatalogVersionCandidate> & Pick<CatalogVersionCandidate, 'id'>,
): CatalogVersionCandidate => ({
  versionNumber: 1,
  status: VersionStatus.Active,
  ...partial,
});

describe('releaseCatalogEligibility', () => {
  it('excludes unactive and already selected for new component', () => {
    const catalog = [
      version({ id: 'v1', versionNumber: 1, status: VersionStatus.Active }),
      version({ id: 'v2', versionNumber: 2, status: VersionStatus.Draft }),
      version({ id: 'v3', versionNumber: 3, status: VersionStatus.Unactive }),
      version({ id: 'v4', versionNumber: 4, status: VersionStatus.Deprecated }),
    ];
    const eligible = eligibleVersionsForComponent(catalog, []);
    expect(eligible.map((item) => item.id)).toEqual(['v1', 'v2', 'v4']);
  });

  it('keeps only later versionNumber when component already in composition', () => {
    const catalog = [
      version({ id: 'v1', versionNumber: 1 }),
      version({ id: 'v2', versionNumber: 2, status: VersionStatus.Draft }),
      version({ id: 'v3', versionNumber: 3 }),
      version({ id: 'v4', versionNumber: 4, status: VersionStatus.Unactive }),
    ];
    const eligible = eligibleVersionsForComponent(catalog, [
      { componentVersionId: 'v1', versionNumber: 1 },
    ]);
    expect(eligible.map((item) => item.id)).toEqual(['v2', 'v3']);
  });

  it('hides already selected ids even if later', () => {
    const catalog = [
      version({ id: 'v2', versionNumber: 2 }),
      version({ id: 'v3', versionNumber: 3 }),
    ];
    const eligible = eligibleVersionsForComponent(catalog, [
      { componentVersionId: 'v2', versionNumber: 2 },
    ]);
    expect(eligible.map((item) => item.id)).toEqual(['v3']);
  });

  it('picks default version with max versionNumber', () => {
    expect(
      defaultVersionId([
        version({ id: 'v1', versionNumber: 1 }),
        version({ id: 'v3', versionNumber: 3 }),
        version({ id: 'v2', versionNumber: 2 }),
      ]),
    ).toBe('v3');
    expect(defaultVersionId([])).toBe('');
  });

  it('builds unique sorted team filter options', () => {
    expect(
      uniqueTeamFilterOptions([
        { id: 't2', name: 'Beta' },
        null,
        { id: 't1', name: 'Alpha' },
        { id: 't2', name: 'Beta' },
      ]),
    ).toEqual([
      { value: 't1', label: 'Alpha' },
      { value: 't2', label: 'Beta' },
    ]);
  });

  it('filters bump candidates without unactive and other selected', () => {
    const eligible = eligibleBumpVersions(
      {
        componentVersionId: 'v1',
        versionNumber: 1,
        status: VersionStatus.Active,
      },
      [
        {
          id: 'v2',
          version: '2',
          versionNumber: 2,
          status: VersionStatus.Draft,
        },
        {
          id: 'v3',
          version: '3',
          versionNumber: 3,
          status: VersionStatus.Unactive,
        },
        {
          id: 'v4',
          version: '4',
          versionNumber: 4,
          status: VersionStatus.Active,
        },
        {
          id: 'v0',
          version: '0',
          versionNumber: 0,
          status: VersionStatus.Active,
        },
      ],
      new Set(['v2']),
    );
    expect(eligible.map((item) => item.id)).toEqual(['v4']);
  });
});
