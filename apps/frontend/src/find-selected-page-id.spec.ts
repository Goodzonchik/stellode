import { findSelectedPageId } from './find-selected-page-id';

const pageIds = [
  'units',
  'applications',
  'services',
  'features',
  'teams',
  'components',
  'tools',
  'help',
] as const;

describe('findSelectedPageId', () => {
  it('maps entity prefixes including diagrams', () => {
    expect(findSelectedPageId('/units/u1/diagram', pageIds)).toBe('units');
    expect(findSelectedPageId('/units/u1/diagram/cross-unit', pageIds)).toBe('units');
    expect(findSelectedPageId('/services/s1/diagram/integrations', pageIds)).toBe(
      'services',
    );
    expect(findSelectedPageId('/applications/a1/versions/current/diagram', pageIds)).toBe(
      'applications',
    );
  });

  it('maps feature-versions to features', () => {
    expect(findSelectedPageId('/feature-versions/fv1/diagram', pageIds)).toBe('features');
  });

  it('does not select diagrams section', () => {
    expect(findSelectedPageId('/diagrams/unit/u1', pageIds)).toBeUndefined();
  });

  it('maps tools routes to tools', () => {
    expect(findSelectedPageId('/tools/mermaid', pageIds)).toBe('tools');
  });
});
