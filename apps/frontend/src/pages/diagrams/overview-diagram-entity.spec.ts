import { isCrossUnitDiagramPath, isOverviewDiagramEntity } from './overview-diagram-entity';

describe('overview-diagram-entity', () => {
  it('detects new cross-unit spa path', () => {
    expect(isCrossUnitDiagramPath('/units/u1/diagram/cross-unit')).toBe(true);
    expect(isCrossUnitDiagramPath('/units/u1/diagram')).toBe(false);
    expect(isCrossUnitDiagramPath('/diagrams/cross-unit')).toBe(false);
  });

  it('treats overview entities as overview', () => {
    expect(isOverviewDiagramEntity('team', '/teams/t1/diagram')).toBe(true);
    expect(isOverviewDiagramEntity('feature-version', '/feature-versions/fv1/diagram')).toBe(
      false,
    );
  });
});
