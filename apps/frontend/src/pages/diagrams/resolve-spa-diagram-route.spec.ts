import { resolveSpaDiagramRoute } from './resolve-spa-diagram-route';

describe('resolveSpaDiagramRoute', () => {
  it('resolves unit team service component feature-version', () => {
    expect(resolveSpaDiagramRoute('/units/u1/diagram')).toEqual({
      entity: 'unit',
      id: 'u1',
    });
    expect(resolveSpaDiagramRoute('/teams/t1/diagram')).toEqual({
      entity: 'team',
      id: 't1',
    });
    expect(resolveSpaDiagramRoute('/services/s1/diagram')).toEqual({
      entity: 'service',
      id: 's1',
    });
    expect(resolveSpaDiagramRoute('/services/s1/diagram/integrations')).toEqual({
      entity: 'service-integrations',
      id: 's1',
    });
    expect(resolveSpaDiagramRoute('/components/c1/diagram')).toEqual({
      entity: 'component',
      id: 'c1',
    });
    expect(resolveSpaDiagramRoute('/feature-versions/fv1/diagram')).toEqual({
      entity: 'feature-version',
      id: 'fv1',
    });
  });

  it('returns null for cross-unit list and unknown paths', () => {
    expect(resolveSpaDiagramRoute('/units/u1/diagram/cross-unit')).toBeNull();
    expect(resolveSpaDiagramRoute('/diagrams/unit/u1')).toBeNull();
    expect(resolveSpaDiagramRoute('/units')).toBeNull();
  });
});
