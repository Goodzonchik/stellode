import {
  shouldShowDeprecatedTriangle,
  statusWarningTriangleKind,
} from './should-show-deprecated-triangle';

describe('shouldShowDeprecatedTriangle', () => {
  it('shows for deprecated CV copy with actualVersion', () => {
    expect(
      shouldShowDeprecatedTriangle({
        label: 'C',
        type: 'component',
        applicationStatus: 'deprecated',
        actualVersion: '1',
      }),
    ).toBe(true);
    expect(
      statusWarningTriangleKind({
        label: 'C',
        type: 'component',
        applicationStatus: 'deprecated',
        actualVersion: '1',
      }),
    ).toBe('deprecated');
  });

  it('shows for unactive CV without HAS_COMPONENT applicationStatus', () => {
    expect(
      statusWarningTriangleKind({
        label: 'C',
        type: 'component',
        status: 'unactive',
        actualVersion: '1',
      }),
    ).toBe('unactive');
  });

  it('hides without version marker', () => {
    expect(
      shouldShowDeprecatedTriangle({
        label: 'C',
        type: 'component',
        applicationStatus: 'deprecated',
      }),
    ).toBe(false);
  });

  it('hides for unit overview component without version', () => {
    expect(
      shouldShowDeprecatedTriangle({
        label: 'C',
        type: 'component',
        applicationStatus: 'deprecated',
      }),
    ).toBe(false);
  });

  it('hides for diff added/removed nodes', () => {
    expect(
      shouldShowDeprecatedTriangle({
        label: 'C',
        type: 'component',
        applicationStatus: 'deprecated',
        actualVersion: '1',
        diffStatus: 'added',
      }),
    ).toBe(false);
  });
});
