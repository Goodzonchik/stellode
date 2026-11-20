import {
  applicationDiagramPath,
  applicationVersionDiagramPath,
  componentDiagramPath,
  featureDiagramPath,
  featureVersionDiagramPath,
  serviceSpaDiagramPath,
  serviceSpaIntegrationsDiagramPath,
  teamDiagramPath,
  unitCrossUnitDiagramPath,
  unitDiagramPath,
} from './spa-diagram-paths';

describe('spa-diagram-paths', () => {
  it('builds unit and cross-unit diagram paths', () => {
    expect(unitDiagramPath('u1')).toBe('/units/u1/diagram');
    expect(unitCrossUnitDiagramPath('u1')).toBe('/units/u1/diagram/cross-unit');
  });

  it('builds entity diagram paths', () => {
    expect(teamDiagramPath('t1')).toBe('/teams/t1/diagram');
    expect(componentDiagramPath('c1')).toBe('/components/c1/diagram');
    expect(featureDiagramPath('f1')).toBe('/features/f1/diagram');
    expect(featureVersionDiagramPath('fv1')).toBe('/feature-versions/fv1/diagram');
  });

  it('builds service diagram paths with optional draft projection', () => {
    expect(serviceSpaDiagramPath('s1')).toBe('/services/s1/diagram');
    expect(serviceSpaDiagramPath('s1', new URLSearchParams('projection=draft'))).toBe(
      '/services/s1/diagram?projection=draft',
    );
    expect(serviceSpaIntegrationsDiagramPath('s1')).toBe(
      '/services/s1/diagram/integrations?fromService=s1',
    );
  });

  it('builds application composition diagram paths', () => {
    expect(applicationDiagramPath('a1')).toBe('/applications/a1/diagram');
    expect(applicationVersionDiagramPath('a1', 'current')).toBe(
      '/applications/a1/versions/current/diagram',
    );
  });
});
