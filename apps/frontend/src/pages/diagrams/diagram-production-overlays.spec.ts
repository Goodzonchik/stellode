import { inferDiagramImpactMode } from './diagram-production-overlays';

describe('inferDiagramImpactMode', () => {
  it('returns on-prod for team diagram', () => {
    expect(
      inferDiagramImpactMode({ nodes: [], relationships: [] }, 'team', 'any-id'),
    ).toBe('on-prod');
  });

  it('returns on-prod for service-integrations diagram', () => {
    expect(
      inferDiagramImpactMode(
        { nodes: [], relationships: [] },
        'service-integrations',
        'any-id',
      ),
    ).toBe('on-prod');
  });

});
