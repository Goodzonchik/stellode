import { FeatureBindingReadinessReason, VersionStatus } from '@stellode/models';
import { draftReadyForProduction } from './draft-ready-for-production';

const mkReady = (ready: boolean) => ({
  applicationId: 'a',
  applicationName: 'A',
  componentId: 'c',
  componentName: 'C',
  componentVersionId: 'cv',
  componentVersion: '1',
  unitId: 'u',
  statusInRelease: ready ? VersionStatus.Active : null,
  ready,
  reason: ready
    ? FeatureBindingReadinessReason.Ready
    : FeatureBindingReadinessReason.ComponentNotInCurrentRelease,
});

describe('draftReadyForProduction', () => {
  it('is false when bindings are empty', () => {
    expect(draftReadyForProduction([], [])).toBe(false);
  });

  it('is true when all USES ready and no cross-unit rows', () => {
    expect(draftReadyForProduction([mkReady(true)], [])).toBe(true);
  });

  it('is false when USES ready but a cross-unit row is not', () => {
    expect(draftReadyForProduction([mkReady(true)], [mkReady(false)])).toBe(false);
  });

  it('is true when USES and cross-unit rows are all ready', () => {
    expect(draftReadyForProduction([mkReady(true)], [mkReady(true)])).toBe(true);
  });

  it('is false when a USES row is not ready even if cross-unit is empty', () => {
    expect(draftReadyForProduction([mkReady(false)], [])).toBe(false);
  });
});
