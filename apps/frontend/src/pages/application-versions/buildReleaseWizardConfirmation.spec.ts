import { buildReleaseWizardConfirmation } from './buildReleaseWizardConfirmation';

type Row = Parameters<typeof buildReleaseWizardConfirmation>[0][number];

const row = (partial: Partial<Row> & Pick<Row, 'component' | 'componentVersion'>): Row => ({
  team: null,
  ...partial,
});

describe('buildReleaseWizardConfirmation', () => {
  it('reports unchanged when composition and versions match', () => {
    const initial = [
      row({
        component: { id: 'c1', name: 'Api' },
        componentVersion: { id: 'v1', version: '1', status: 'active', applicationStatus: 'active' },
      }),
    ];
    const result = buildReleaseWizardConfirmation(initial, initial);
    expect(result.excludedFromRelease).toEqual([]);
    expect(result.newInRelease).toEqual([]);
    expect(result.versionChanges).toEqual([]);
    expect(result.unchanged.length).toBe(1);
    expect(result.unchanged[0].componentVersion.id).toBe('v1');
  });

  it('whole component removed lists excluded only', () => {
    const initial = [
      row({
        component: { id: 'c1', name: 'Api' },
        componentVersion: { id: 'v1', version: '1', status: 'active' },
      }),
    ];
    const finalRows: Row[] = [];
    const result = buildReleaseWizardConfirmation(initial, finalRows);
    expect(result.excludedFromRelease.length).toBe(1);
    expect(result.excludedFromRelease[0].componentVersion.id).toBe('v1');
    expect(result.newInRelease).toEqual([]);
    expect(result.versionChanges).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });

  it('whole new component lists new only', () => {
    const initial: Row[] = [];
    const finalRows = [
      row({
        component: { id: 'c2', name: 'Web' },
        componentVersion: { id: 'v2', version: '2', status: 'draft' },
      }),
    ];
    const result = buildReleaseWizardConfirmation(initial, finalRows);
    expect(result.excludedFromRelease).toEqual([]);
    expect(result.newInRelease.length).toBe(1);
    expect(result.newInRelease[0].componentVersion.id).toBe('v2');
    expect(result.versionChanges).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });

  it('version replace aggregates under versionChanges not excluded/new', () => {
    const initial = [
      row({
        component: { id: 'c1', name: 'Api' },
        componentVersion: { id: 'v1', version: '1', status: 'active' },
      }),
    ];
    const finalRows = [
      row({
        component: { id: 'c1', name: 'Api' },
        componentVersion: { id: 'v2', version: '2', status: 'draft' },
      }),
    ];
    const result = buildReleaseWizardConfirmation(initial, finalRows);
    expect(result.excludedFromRelease).toEqual([]);
    expect(result.newInRelease).toEqual([]);
    expect(result.versionChanges.length).toBe(1);
    expect(result.versionChanges[0].before.map((item) => item.id)).toEqual(['v1']);
    expect(result.versionChanges[0].after.map((item) => item.id)).toEqual(['v2']);
    expect(result.unchanged).toEqual([]);
  });

  it('table bump v1 to v2 is versionChanges not excluded plus new', () => {
    const initial = [
      row({
        component: { id: 'c1', name: 'Api' },
        componentVersion: { id: 'cv-1', version: '1.0', status: 'active' },
      }),
    ];
    const afterBump = [
      row({
        component: { id: 'c1', name: 'Api' },
        componentVersion: { id: 'cv-2', version: '2.0', status: 'draft' },
      }),
    ];
    const result = buildReleaseWizardConfirmation(initial, afterBump);
    expect(result.excludedFromRelease).toEqual([]);
    expect(result.newInRelease).toEqual([]);
    expect(result.versionChanges).toHaveLength(1);
    expect(result.versionChanges[0].before).toEqual([
      { id: 'cv-1', version: '1.0', status: 'active' },
    ]);
    expect(result.versionChanges[0].after).toEqual([
      { id: 'cv-2', version: '2.0', status: 'draft' },
    ]);
  });
});
