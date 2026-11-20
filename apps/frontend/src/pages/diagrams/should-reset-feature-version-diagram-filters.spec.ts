import { shouldResetFeatureVersionDiagramFilters } from './should-reset-feature-version-diagram-filters';

describe('shouldResetFeatureVersionDiagramFilters', () => {
  it('resets on fresh entry after leaving feature-version hub', () => {
    expect(shouldResetFeatureVersionDiagramFilters('')).toBe(true);
  });

  it('keeps filters when switching between feature versions', () => {
    expect(shouldResetFeatureVersionDiagramFilters('fv-prev')).toBe(false);
  });
});
