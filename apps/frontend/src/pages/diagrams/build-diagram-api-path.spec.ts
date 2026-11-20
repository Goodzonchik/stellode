import { buildDiagramApiPath } from './build-diagram-api-path';

describe('buildDiagramApiPath', () => {
  it('maps spa entities to /api diagrams paths', () => {
    expect(buildDiagramApiPath('unit', 'u1', 'on-prod')).toBe('/diagrams/unit/u1');
    expect(buildDiagramApiPath('team', 't1', 'on-prod')).toBe('/diagrams/team/t1');
    expect(buildDiagramApiPath('feature-version', 'fv1', 'on-prod')).toBe(
      '/diagrams/feature-version/fv1',
    );
    expect(buildDiagramApiPath('service', 's1', 'draft')).toBe(
      '/diagrams/service/s1?projection=draft',
    );
    expect(buildDiagramApiPath('service-integrations', 's1', 'on-prod')).toBe(
      '/diagrams/service/s1/integrations',
    );
  });
});
