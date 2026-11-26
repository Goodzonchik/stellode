import { VersionStatus } from './version-status';
import {
  applyApplicationStatusChange,
  bumpCompositionRow,
  defaultApplicationStatusForLifecycle,
  findDuplicateActiveComponentIds,
  mergeAddedCompositionRow,
  type CompositionApplicationStatusRow,
} from './release-composition-rules';

const row = (
  partial: Partial<CompositionApplicationStatusRow> &
    Pick<CompositionApplicationStatusRow, 'componentId' | 'componentVersionId'>,
): CompositionApplicationStatusRow => ({
  lifecycleStatus: VersionStatus.Active,
  applicationStatus: VersionStatus.Active,
  ...partial,
});

describe('releaseCompositionRules', () => {
  it('defaults draft lifecycle to active application status', () => {
    expect(defaultApplicationStatusForLifecycle(VersionStatus.Draft)).toBe(VersionStatus.Active);
    expect(defaultApplicationStatusForLifecycle(VersionStatus.Deprecated)).toBe(
      VersionStatus.Deprecated,
    );
  });

  it('adds draft row as active and demotes previous same component', () => {
    const initial = [
      row({ componentId: 'c1', componentVersionId: 'v1', applicationStatus: VersionStatus.Active }),
    ];
    const added = row({
      componentId: 'c1',
      componentVersionId: 'v2',
      lifecycleStatus: VersionStatus.Draft,
    });
    const next = mergeAddedCompositionRow(initial, added);
    expect(next.find((item) => item.componentVersionId === 'v1')?.applicationStatus).toBe(
      VersionStatus.Deprecated,
    );
    expect(next.find((item) => item.componentVersionId === 'v2')?.applicationStatus).toBe(
      VersionStatus.Active,
    );
  });

  it('adds deprecated lifecycle as deprecated without demoting siblings', () => {
    const initial = [
      row({ componentId: 'c1', componentVersionId: 'v1', applicationStatus: VersionStatus.Active }),
    ];
    const added = row({
      componentId: 'c1',
      componentVersionId: 'v2',
      lifecycleStatus: VersionStatus.Deprecated,
    });
    const next = mergeAddedCompositionRow(initial, added);
    expect(next.find((item) => item.componentVersionId === 'v1')?.applicationStatus).toBe(
      VersionStatus.Active,
    );
    expect(next.find((item) => item.componentVersionId === 'v2')?.applicationStatus).toBe(
      VersionStatus.Deprecated,
    );
  });

  it('enforces at most one active per component when status changes', () => {
    const initial = [
      row({ componentId: 'c1', componentVersionId: 'v1', applicationStatus: VersionStatus.Active }),
      row({
        componentId: 'c1',
        componentVersionId: 'v2',
        applicationStatus: VersionStatus.Deprecated,
      }),
    ];
    const next = applyApplicationStatusChange(initial, 'v2', VersionStatus.Active);
    expect(next.find((item) => item.componentVersionId === 'v1')?.applicationStatus).toBe(
      VersionStatus.Deprecated,
    );
    expect(next.find((item) => item.componentVersionId === 'v2')?.applicationStatus).toBe(
      VersionStatus.Active,
    );
  });

  it('locks draft rows to active application status', () => {
    const initial = [
      row({
        componentId: 'c1',
        componentVersionId: 'v1',
        lifecycleStatus: VersionStatus.Draft,
        applicationStatus: VersionStatus.Active,
      }),
    ];
    const next = applyApplicationStatusChange(initial, 'v1', VersionStatus.Deprecated);
    expect(next[0].applicationStatus).toBe(VersionStatus.Active);
  });

  it('bump replaces row like remove plus add and becomes active', () => {
    const initial = [
      row({
        componentId: 'c1',
        componentVersionId: 'v1',
        applicationStatus: VersionStatus.Deprecated,
      }),
    ];
    const next = bumpCompositionRow(initial, 'v1', {
      componentVersionId: 'v2',
      lifecycleStatus: VersionStatus.Draft,
    });
    expect(next.map((item) => item.componentVersionId)).toEqual(['v2']);
    expect(next[0].applicationStatus).toBe(VersionStatus.Active);
    expect(next[0].lifecycleStatus).toBe(VersionStatus.Draft);
  });

  it('bump demotes other active rows of the same component', () => {
    const initial = [
      row({ componentId: 'c1', componentVersionId: 'v1', applicationStatus: VersionStatus.Active }),
      row({
        componentId: 'c1',
        componentVersionId: 'v1b',
        applicationStatus: VersionStatus.Deprecated,
      }),
    ];
    const next = bumpCompositionRow(initial, 'v1b', {
      componentVersionId: 'v2',
      lifecycleStatus: VersionStatus.Active,
    });
    expect(next.find((item) => item.componentVersionId === 'v1')?.applicationStatus).toBe(
      VersionStatus.Deprecated,
    );
    expect(next.find((item) => item.componentVersionId === 'v2')?.applicationStatus).toBe(
      VersionStatus.Active,
    );
    expect(next.find((item) => item.componentVersionId === 'v1b')).toBeUndefined();
  });

  it('finds components with more than one active application status', () => {
    expect(
      findDuplicateActiveComponentIds([
        {
          componentId: 'c1',
          componentVersionId: 'v1',
          applicationStatus: VersionStatus.Active,
        },
        {
          componentId: 'c1',
          componentVersionId: 'v2',
          applicationStatus: VersionStatus.Active,
        },
        {
          componentId: 'c2',
          componentVersionId: 'v3',
          applicationStatus: VersionStatus.Active,
        },
      ]),
    ).toEqual(['c1']);
  });
});
